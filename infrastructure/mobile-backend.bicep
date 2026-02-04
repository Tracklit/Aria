// Azure Infrastructure for Aria Mobile Backend
// Deploys Node.js Express backend for mobile app API

// Parameters
param appName string = 'aria-mobile'
param environment string = 'prod'
param location string = 'westus'
param dockerImage string = 'tracklitprodtnrusd.azurecr.io/aria-mobile-backend:latest'

// Reuse existing TrackLit resources
param postgresServerName string = 'pg-tracklit-prod-tnrusd'
param redisName string = 'redis-tracklit-prod-tnrusd'
param keyVaultName string = 'kv-tracklit-prod-tnrusd'
param containerRegistryName string = 'tracklitprodtnrusd'
param existingPostgresResourceGroup string = 'rg-tracklit-dev'
param existingKeyVaultResourceGroup string = 'rg-tracklit-dev'

// App Service Plan (B2 SKU - 2 cores, 3.5GB RAM)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-${appName}-${environment}'
  location: location
  sku: {
    name: 'B2'
    tier: 'Basic'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
  tags: {
    Environment: environment
    Application: 'Aria Mobile Backend'
    ManagedBy: 'Bicep'
  }
}

// Storage Account for profile images and uploads
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: 'ariamobileprodstorage'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
  }
  tags: {
    Environment: environment
    Application: 'Aria Mobile Backend'
  }
}

// Blob container for profile images
resource profileImagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2022-09-01' = {
  name: '${storageAccount.name}/default/profile-images'
  properties: {
    publicAccess: 'Blob'
  }
}

// Application Insights for monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appins-${appName}-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
  tags: {
    Environment: environment
    Application: 'Aria Mobile Backend'
  }
}

// Reference existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: keyVaultName
  scope: resourceGroup(existingKeyVaultResourceGroup)
}

// App Service for Node.js backend
resource appService 'Microsoft.Web/sites@2022-03-01' = {
  name: 'app-${appName}-${environment}'
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOCKER|${dockerImage}'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/api/health'
      appSettings: [
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${containerRegistryName}.azurecr.io'
        }
        {
          name: 'DOCKER_ENABLE_CI'
          value: 'true'
        }
        {
          name: 'WEBSITES_PORT'
          value: '8080'
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/DATABASE-URL/)'
        }
        {
          name: 'REDIS_URL'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/REDIS-URL/)'
        }
        {
          name: 'JWT_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/JWT-SECRET/)'
        }
        {
          name: 'ARIA_API_URL'
          value: 'https://aria-dev-api.azurewebsites.net'
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'CORS_ORIGIN'
          value: 'exp://localhost:8081,ariamobile://,https://aria.tracklit.app'
        }
      ]
    }
  }
  tags: {
    Environment: environment
    Application: 'Aria Mobile Backend'
    BackendType: 'Node.js Express'
  }
}

// Note: Key Vault access policy must be configured separately after deployment
// Run this command after deployment:
// az keyvault set-policy --name kv-tracklit-dev-kvnx2h --object-id <app-service-principal-id> --secret-permissions get list

// Outputs
output appServiceName string = appService.name
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output appServicePrincipalId string = appService.identity.principalId
output storageAccountName string = storageAccount.name
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
