// =============================================================================
// Aria Azure Infrastructure - Container Apps with Full Services
// =============================================================================
// Deploys Aria API (Python + Node.js) to Azure Container Apps with all required
// Azure AI/ML services for a production-ready deployment
// =============================================================================

targetScope = 'resourceGroup'

// =============================================================================
// PARAMETERS
// =============================================================================

@description('Application name prefix for all resources')
param appName string = 'aria'

@description('Environment (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Tags to apply to all resources')
param tags object = {
  Application: 'Aria'
  Environment: environment
  ManagedBy: 'Bicep'
}

// =============================================================================
// EXISTING TRACKLIT RESOURCES (Reference)
// =============================================================================

@description('Existing TrackLit Key Vault name')
param existingKeyVaultName string = ''

@description('Existing TrackLit Key Vault resource group')
param existingKeyVaultResourceGroup string = ''

@description('Existing PostgreSQL server name (TrackLit)')
param existingPostgresServerName string = ''

@description('Existing PostgreSQL resource group')
param existingPostgresResourceGroup string = ''

@description('Existing Redis cache name (TrackLit)')
param existingRedisCacheName string = ''

@description('Existing Redis resource group')
param existingRedisResourceGroup string = ''

// =============================================================================
// CONTAINER CONFIGURATION
// =============================================================================

@description('Container Registry name (Azure Container Registry)')
param containerRegistryName string

@description('Python API Docker image (with tag)')
param pythonApiImage string = 'aria-api:latest'

@description('Node.js API Docker image (with tag)')
param nodeApiImage string = 'aria-mobile-backend:latest'

@description('Minimum replicas for Python API')
param pythonApiMinReplicas int = 1

@description('Maximum replicas for Python API')
param pythonApiMaxReplicas int = 3

@description('Minimum replicas for Node.js API')
param nodeApiMinReplicas int = 1

@description('Maximum replicas for Node.js API')
param nodeApiMaxReplicas int = 3

// =============================================================================
// AI SERVICES CONFIGURATION
// =============================================================================

@description('Deploy Azure OpenAI Service')
param deployAzureOpenAI bool = true

@description('Azure OpenAI model deployments')
param openAIModelDeployments array = [
  {
    name: 'gpt-4o'
    model: 'gpt-4o'
    version: '2024-08-06'
    capacity: 30
  }
  {
    name: 'gpt-4o-mini'
    model: 'gpt-4o-mini'
    version: '2024-07-18'
    capacity: 60
  }
  {
    name: 'text-embedding-ada-002'
    model: 'text-embedding-ada-002'
    version: '2'
    capacity: 60
  }
]

@description('Deploy Azure Speech Services')
param deployAzureSpeech bool = true

@description('Deploy Azure Translator')
param deployAzureTranslator bool = true

@description('Deploy Azure Communication Services')
param deployAzureCommunication bool = true

@description('Use lean/cost-optimized production settings (LRS storage, 30-day retention, no zone redundancy)')
param leanProduction bool = false

// =============================================================================
// VARIABLES
// =============================================================================

var resourcePrefix = '${appName}-${environment}'
var uniqueSuffix = substring(uniqueString(resourceGroup().id, appName), 0, 6)

// Resource names
var containerAppsEnvName = 'cae-${resourcePrefix}'
var logAnalyticsName = 'log-${resourcePrefix}-${uniqueSuffix}'
var appInsightsName = 'appi-${resourcePrefix}'
var keyVaultName = 'kv-${appName}${environment}${uniqueSuffix}'
var storageAccountName = 'st${appName}${environment}${uniqueSuffix}'
var openAIAccountName = 'oai-${resourcePrefix}'
var speechAccountName = 'spch-${resourcePrefix}'
var translatorAccountName = 'tran-${resourcePrefix}'
var communicationServiceName = 'acs-${resourcePrefix}'

// Container Apps names
var pythonApiAppName = 'ca-${appName}-api-${environment}'
var nodeApiAppName = 'ca-${appName}-mobile-${environment}'

// =============================================================================
// MONITORING & LOGGING
// =============================================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: (environment == 'prod' && !leanProduction) ? 90 : 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    RetentionInDays: (environment == 'prod' && !leanProduction) ? 90 : 30
  }
}

// =============================================================================
// KEY VAULT (New or Reference Existing)
// =============================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = if (existingKeyVaultName == '') {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: environment == 'prod' ? true : false
    publicNetworkAccess: 'Enabled'
  }
}

// Reference existing Key Vault if provided
resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = if (existingKeyVaultName != '') {
  name: existingKeyVaultName
  scope: resourceGroup(existingKeyVaultResourceGroup)
}

var keyVaultUri = existingKeyVaultName != '' ? existingKeyVault.properties.vaultUri : keyVault.properties.vaultUri
var keyVaultId = existingKeyVaultName != '' ? existingKeyVault.id : keyVault.id

// =============================================================================
// STORAGE ACCOUNT
// =============================================================================

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: (environment == 'prod' && !leanProduction) ? 'Standard_GRS' : 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Blob containers
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource videosContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'aria-videos'
  properties: {
    publicAccess: 'None'
  }
}

resource profileImagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'profile-images'
  properties: {
    publicAccess: 'Blob'
  }
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'uploads'
  properties: {
    publicAccess: 'None'
  }
}

// =============================================================================
// AZURE CONTAINER REGISTRY
// =============================================================================

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  tags: tags
  sku: {
    name: environment == 'prod' ? 'Standard' : 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

// =============================================================================
// AZURE OPENAI SERVICE
// =============================================================================

resource openAI 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = if (deployAzureOpenAI) {
  name: openAIAccountName
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: openAIAccountName
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// Azure OpenAI Model Deployments
@batchSize(1)
resource openAIDeployments 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = [for deployment in openAIModelDeployments: if (deployAzureOpenAI) {
  parent: openAI
  name: deployment.name
  sku: {
    name: 'Standard'
    capacity: deployment.capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: deployment.model
      version: deployment.version
    }
    raiPolicyName: 'Microsoft.Default'
  }
}]

// =============================================================================
// AZURE SPEECH SERVICES
// =============================================================================

resource speechService 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = if (deployAzureSpeech) {
  name: speechAccountName
  location: location
  tags: tags
  kind: 'SpeechServices'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: speechAccountName
    publicNetworkAccess: 'Enabled'
  }
}

// =============================================================================
// AZURE TRANSLATOR
// =============================================================================

resource translator 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = if (deployAzureTranslator) {
  name: translatorAccountName
  location: location
  tags: tags
  kind: 'TextTranslation'
  sku: {
    name: 'S1'
  }
  properties: {
    customSubDomainName: translatorAccountName
    publicNetworkAccess: 'Enabled'
  }
}

// =============================================================================
// AZURE COMMUNICATION SERVICES
// =============================================================================

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = if (deployAzureCommunication) {
  name: communicationServiceName
  location: 'global' // ACS is a global service
  tags: tags
  properties: {
    dataLocation: 'UnitedStates'
  }
}

// =============================================================================
// CONTAINER APPS ENVIRONMENT
// =============================================================================

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    zoneRedundant: (environment == 'prod' && !leanProduction) ? true : false
  }
}

// =============================================================================
// CONTAINER APP - PYTHON API (FastAPI)
// =============================================================================

resource pythonApiApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: pythonApiAppName
  location: location
  tags: union(tags, { Service: 'Python API' })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: environment == 'prod' 
            ? ['https://tracklit.app', 'https://www.tracklit.app', 'https://aria.tracklit.app']
            : ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'appinsights-connection-string'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'aria-api'
          image: '${containerRegistry.properties.loginServer}/${pythonApiImage}'
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            // Application Insights
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection-string'
            }
            // Environment
            {
              name: 'ENVIRONMENT'
              value: environment
            }
            {
              name: 'LOG_LEVEL'
              value: environment == 'prod' ? 'INFO' : 'DEBUG'
            }
            // Port configuration
            {
              name: 'PORT'
              value: '8000'
            }
            {
              name: 'WORKERS'
              value: '4'
            }
            // Key Vault reference for secrets
            {
              name: 'AZURE_KEY_VAULT_URL'
              value: keyVaultUri
            }
            // Azure OpenAI
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: deployAzureOpenAI ? openAI.properties.endpoint : ''
            }
            {
              name: 'AZURE_OPENAI_DEPLOYMENT_NAME'
              value: 'gpt-4o'
            }
            // Azure Speech
            {
              name: 'AZURE_SPEECH_REGION'
              value: location
            }
            // Azure Translator
            {
              name: 'AZURE_TRANSLATOR_REGION'
              value: location
            }
            {
              name: 'AZURE_TRANSLATOR_ENDPOINT'
              value: deployAzureTranslator ? translator.properties.endpoint : ''
            }
            // Storage
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storageAccount.name
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health/live'
                port: 8000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health/ready'
                port: 8000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: pythonApiMinReplicas
        maxReplicas: pythonApiMaxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// =============================================================================
// CONTAINER APP - NODE.JS API (Express - Mobile Backend)
// =============================================================================

resource nodeApiApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: nodeApiAppName
  location: location
  tags: union(tags, { Service: 'Node.js API' })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['exp://localhost:8081', 'ariamobile://', 'https://aria.tracklit.app']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'appinsights-connection-string'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'aria-mobile-backend'
          image: '${containerRegistry.properties.loginServer}/${nodeApiImage}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            // Application Insights
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection-string'
            }
            // Environment
            {
              name: 'NODE_ENV'
              value: environment == 'prod' ? 'production' : 'development'
            }
            // Port configuration
            {
              name: 'PORT'
              value: '8080'
            }
            // Key Vault for secrets
            {
              name: 'AZURE_KEY_VAULT_URL'
              value: keyVaultUri
            }
            // Reference to Python API
            {
              name: 'ARIA_API_URL'
              value: 'https://${pythonApiAppName}.${containerAppsEnvironment.properties.defaultDomain}'
            }
            // Storage
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storageAccount.name
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 8080
              }
              initialDelaySeconds: 20
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: nodeApiMinReplicas
        maxReplicas: nodeApiMaxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// =============================================================================
// RBAC ROLE ASSIGNMENTS
// =============================================================================

// Key Vault Secrets User role for Python API
resource pythonApiKeyVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (existingKeyVaultName == '') {
  name: guid(keyVault.id, pythonApiApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: pythonApiApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Key Vault Secrets User role for Node.js API
resource nodeApiKeyVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (existingKeyVaultName == '') {
  name: guid(keyVault.id, nodeApiApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: nodeApiApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Cognitive Services OpenAI User role for Python API
resource pythonApiOpenAIRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployAzureOpenAI) {
  name: guid(openAI.id, pythonApiApp.id, 'Cognitive Services OpenAI User')
  scope: openAI
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')
    principalId: pythonApiApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Blob Data Contributor for Python API
resource pythonApiStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, pythonApiApp.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: pythonApiApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Blob Data Contributor for Node.js API
resource nodeApiStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, nodeApiApp.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: nodeApiApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

output resourceGroupName string = resourceGroup().name
output containerAppsEnvironmentName string = containerAppsEnvironment.name
output containerAppsEnvironmentDomain string = containerAppsEnvironment.properties.defaultDomain

// Container Apps
output pythonApiName string = pythonApiApp.name
output pythonApiUrl string = 'https://${pythonApiApp.properties.configuration.ingress.fqdn}'
output pythonApiPrincipalId string = pythonApiApp.identity.principalId

output nodeApiName string = nodeApiApp.name
output nodeApiUrl string = 'https://${nodeApiApp.properties.configuration.ingress.fqdn}'
output nodeApiPrincipalId string = nodeApiApp.identity.principalId

// Monitoring
output appInsightsName string = appInsights.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output logAnalyticsWorkspaceId string = logAnalytics.properties.customerId

// Key Vault
output keyVaultName string = existingKeyVaultName != '' ? existingKeyVaultName : keyVault.name
output keyVaultUri string = keyVaultUri

// Storage
output storageAccountName string = storageAccount.name

// Container Registry
output containerRegistryLoginServer string = containerRegistry.properties.loginServer

// AI Services
output azureOpenAIEndpoint string = deployAzureOpenAI ? openAI.properties.endpoint : ''
output azureOpenAIName string = deployAzureOpenAI ? openAI.name : ''
output azureSpeechEndpoint string = deployAzureSpeech ? speechService.properties.endpoint : ''
output azureTranslatorEndpoint string = deployAzureTranslator ? translator.properties.endpoint : ''
output azureCommunicationEndpoint string = deployAzureCommunication ? 'https://${communicationService.name}.communication.azure.com' : ''
