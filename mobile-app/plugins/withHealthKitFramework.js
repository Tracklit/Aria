const { withXcodeProject } = require('expo/config-plugins');

const withHealthKitFramework = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    // Add HealthKit.framework as an optional framework
    // This ensures the framework is linked even if the CocoaPods pod doesn't do it
    const frameworks = xcodeProject.pbxFrameworksBuildPhaseObj(xcodeProject.getFirstTarget().uuid);

    // Check if HealthKit is already linked
    const existingFiles = xcodeProject.pbxFrameworksBuildPhaseObj(xcodeProject.getFirstTarget().uuid);

    xcodeProject.addFramework('HealthKit.framework', { weak: false });

    return config;
  });
};

module.exports = withHealthKitFramework;
