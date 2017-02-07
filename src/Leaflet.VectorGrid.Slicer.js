import geojsonvt from 'geojson-vt';
import * as topojson from "topojson-client";

L.VectorGrid.Slicer = L.VectorGrid.extend({

  options: {
    vectorTileLayerName: 'sliced',
    extent: 4096,  // Default for geojson-vt
    maxZoom: 14    // Default for geojson-vt
  },

  cachedOptions: {},
  slicers: {},

  initialize: function(geojson, options) {
    L.VectorGrid.prototype.initialize.call(this, options);

    // Create a shallow copy of this.options, excluding things that might
    // be functions - we only care about topojson/geojsonvt options
    for (var i in this.options) {
      if (i !== 'rendererFactory' &&
        i !== 'vectorTileLayerStyles' &&
        typeof (this.options[i]) !== 'function'
      ) {
        this.cachedOptions[i] = this.options[i];
      }
    }

    // Given a blob of GeoJSON and some topojson/geojson-vt options, configure slicers.
    if (geojson.type && geojson.type === 'Topology') {
      for (var layerName in geojson.objects) {
        this.slicers[layerName] = geojsonvt(
          topojson.feature(geojson, geojson.objects[layerName])
        , options);
      }
    } else {
      this.slicers[options.vectorTileLayerName] = geojsonvt(geojson, options);
    }

  },

  _getVectorTilePromise: function(coords) {
    var _this = this;

    var p = new Promise( function (res) {
      var tileLayers = {};
      for (var layerName in _this.slicers) {
        var slicedTileLayer = _this.slicers[layerName].getTile(coords.z, coords.x, coords.y);

        if (slicedTileLayer) {
          var vectorTileLayer = {
            features: [],
            extent: _this.cachedOptions.extent,
            name: _this.cachedOptions.vectorTileLayerName,
            length: slicedTileLayer.features.length
          }

          for (var i in slicedTileLayer.features) {
            var feat = {
              geometry: slicedTileLayer.features[i].geometry,
              properties: slicedTileLayer.features[i].tags,
              type: slicedTileLayer.features[i].type  // 1 = point, 2 = line, 3 = polygon
            }
            vectorTileLayer.features.push(feat);
          }
          tileLayers[layerName] = vectorTileLayer;
        }
      }
      var data = { layers: tileLayers, coords: coords };
      res(data);
    });
    return p;
  },

});


L.vectorGrid.slicer = function (geojson, options) {
  return new L.VectorGrid.Slicer(geojson, options);
};

