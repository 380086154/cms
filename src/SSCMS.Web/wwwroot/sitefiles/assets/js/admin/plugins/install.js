﻿var $url = '/plugins/install';
var $urlActionsDownload = $url + '/actions/download';
var $urlActionsUpdate = $url + '/actions/update';
var $urlActionsRestart = $url + '/actions/restart';

var data = utils.init({
  pluginIds: _.split(utils.getQueryString('pluginIds'), ','),
  pageType: utils.getQueryBoolean('isUpdate') ? '升级' : '安装',
  active: 0,
  success: false,
  version: null,
  pluginPathDict: null,

  percentage: 0,
  interval: 500,

  listPackages: [],
  listPackageIds: [],
  listIndex: 0,

  currentPackage: {},
  currentPackages: [],
  currentDownloadingId: 0,
  currentDownloadIds: [],
  currentUpdatingId: 0,
  currentUpdatedIds: []
});

var methods = {
  apiGet: function () {
    var $this = this;

    setInterval(function () {
      if ($this.percentage > 80) {
        $this.interval = 3000;
      }
      if ($this.percentage > 95) return;
      $this.percentage += 1;
    }, this.interval);

    $api.get($url, {
      params: {
        pluginIds: utils.getQueryString('pluginIds')
      }
    }).then(function (response) {
      var res = response.data;

      $this.version = res.version;
      $this.pluginPathDict = res.pluginPathDict;

      $this.getPackages();
    }).catch(function (error) {
      utils.error(error);
    }).then(function () {
      utils.loading($this, false);
    });
  },

  apiDownload: function (pluginId, version) {
    var $this = this;

    var path = this.pluginPathDict[pluginId];
    $api.post($urlActionsDownload, {
      pluginId: pluginId,
      version: version,
      path: path
    }).then(function (response) {
      var res = response.data;
      if (!res.value) {
        setTimeout(function () {
          $this.apiDownload(pluginId, version);
        }, 1000);
        return;
      }

      $this.currentDownloadingId = 0;
      $this.currentDownloadIds.push(pluginId);
      $this.download();
    }).catch(function (error) {
      utils.error(error);
    });
  },

  apiUpdate: function (pluginId, version, packageType) {
    var $this = this;

    $api.post($urlActionsUpdate, {
      pluginId: pluginId,
      version: version,
      packageType: packageType
    }).then(function (response) {
      var res = response.data;

      $this.currentUpdatingId = 0;
      $this.currentUpdatedIds.push(pluginId);
      $this.update();
    }).catch(function (error) {
      utils.error(error);
    });
  },

  apiRestart: function (callback) {
    var $this = this;

    $api.post($urlActionsRestart, {
      isDisablePlugins: callback ? true : false
    }).then(function (response) {
      setTimeout(function () {
        if (callback) {
          callback();
        } else {
          $this.percentage = 100;
          utils.alertSuccess({
            title: '插件' + $this.pageType + '成功',
            text: '插件' + $this.pageType + '成功，系统需要重载页面',
            callback: function() {
              window.top.location.reload(true);
            }
          });
        }
      }, 30000);
    }).catch(function (error) {
      utils.error(error);
    });
  },

  getPackages: function () {
    var $this = this;

    cloud.getUpdates($this.version, $this.pluginIds).then(function (response) {
      var res = response.data;

      var plugins = res.plugins;

      for (var i = 0; i < plugins.length; i++) {
        var release = plugins[i];

        // for (var j = 0; j < release.pluginReferences.length; j++) {
        //   var reference = release.pluginReferences[j];

        //   if ($this.listPackageIds.indexOf(reference.id) === -1) {
        //     $this.listPackageIds.push(reference.id);
        //     $this.listPackages.push({
        //       id: reference.id,
        //       version: reference.version,
        //       packageType: 'Plugin'
        //     });
        //   }
        // }

        // for (var k = 0; k < release.libraryReferences.length; k++) {
        //   var reference = release.libraryReferences[k];
        //   if ($this.listPackageIds.indexOf(reference.id) === -1) {
        //     $this.listPackageIds.push(reference.id);
        //     $this.listPackages.push({
        //       id: reference.id,
        //       version: reference.version,
        //       packageType: 'Library'
        //     });
        //   }
        // }

        if ($this.listPackageIds.indexOf(release.pluginId) === -1) {
          $this.listPackageIds.push(release.pluginId);
          $this.listPackages.push({
            id: release.pluginId,
            version: release.version,
            packageType: 'Plugin'
          });
        }
      }

      $this.apiRestart(function() {
        setTimeout(function() {
          $this.installListPackage();
        }, 10000);
      });
      
    }).catch(function (error) {
      utils.error(error);
    });
  },

  installListPackage: function () {
    var $this = this;

    if ($this.listIndex === $this.listPackages.length) {
      this.apiRestart();
      return;
    }

    $this.package = $this.listPackages[$this.listIndex];
    $this.currentPackages.push($this.package);

    $this.download();
  },

  download: function () {
    var $this = this;

    for (var i = 0; i < $this.currentPackages.length; i++) {
      var package = $this.currentPackages[i];
      if ($this.currentDownloadIds.indexOf(package.id) == -1) {
        $this.currentDownloadingId = package.id;
        $this.apiDownload(package.id, package.version)
        return;
      }
    }

    $this.update();
  },

  update: function () {
    var $this = this;
    $this.active = 1;

    for (var i = 0; i < $this.currentPackages.length; i++) {
      var package = $this.currentPackages[i];
      if ($this.currentUpdatedIds.indexOf(package.id) == -1) {
        $this.currentUpdatingId = package.id;
        $this.apiUpdate(package.id, package.version, package.packageType);
        return;
      }
    }

    $this.updateSuccess();
  },

  updateSuccess: function () {
    var $this = this;

    $this.listIndex++;
    $this.active = 0;

    $this.currentPackage = {};
    $this.currentPackages = [];
    $this.currentDownloadingId = 0;
    $this.currentDownloadIds = [];
    $this.currentUpdatingId = 0;
    $this.currentUpdatedIds = [];

    $this.installListPackage();
  },

  format: function(percentage) {
    if (percentage === 100) return '插件' + this.pageType + '成功！';
    return utils.getQueryBoolean('isUpdate') ? '插件升级中，升级过程可能需要持续几分钟，请勿关闭此页面' : '插件安装中...';
  }
};

var $vue = new Vue({
  el: '#main',
  data: data,
  methods: methods,
  created: function () {
    this.apiGet();
  }
});