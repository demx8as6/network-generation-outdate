'use strict';
var fs = require('fs');
var path = require('path');
var geoCalc = require('geo-calculator');
var PNGReader = require('png.js');

//some counters
var siteId = 0;
var losLinkId = 0;
var networkElementId = 0;	

var time = new Date();
console.log(time);

// main configurations
var config = {
		numberOfAggregatorSites: 1000,
		maxNumberOfNetworkElementsPerSite: 6,
		selectedMap: 'germany',
		maps: {
			germany: {
				boundingbox: [47.2701114,55.099161,5.8663153,15.0419319],
				imageUrl: 'images/Germany.png'
			} // add more maps, if you like and change 'selectedMap' value
		},
		outputFilename: 'target/network.json'
	};

// ### global parameters
var map = config.maps[config.selectedMap];
var latMax = map.boundingbox[1]
var lngMax = map.boundingbox[3]
var latMin = map.boundingbox[0]
var lngMin = map.boundingbox[2]
var network = {
		aggSiteIds: [],
		sites: [],
		losLinks: [],
		networkElements: []
	};

// ### functions

/** 
 * @desc creates the network elements for a given site 
 * @param Site site - the site which should get network elements. 
*/  
var createNetworkElements = function(site) {
	var networkElements = [];
	var neId = 0;
	var count = Math.random()*config.maxNumberOfNetworkElementsPerSite;
	while (neId < count) {
		var ne = {
		 		id: networkElementId++,
				userId: (site.id + "-" + count),
				name : "sysName-" + site.id + "-" + neId,
				type : "unknown"
			};
	 	network.networkElements.push(ne);	
	 	networkElements.push(ne.id);
	 	neId++;
	};
	return networkElements;
}

/** 
 * @desc generates a random longitude value within the map bounderies
 * @return double - a longitude value with max six digits: ~0.1m resolution. 
*/  
var longitude = function() {
	var start = map.boundingbox[2];
	var end = map.boundingbox[3];
	
	var longitude =  start + (end-start)*(Math.random());
	return formatNumber(longitude, 6);
};

/** 
 * @desc generates a random latitude value within the map bounderies
 * @return double - a latitude value with max six digits: ~0.1m resolution. 
*/  
var latitude = function() {
	var start = map.boundingbox[0];
	var end = map.boundingbox[1];
	
	var latitude  = start + (end-start)*(Math.random());
	return formatNumber(latitude, 6);
};

/** 
 * @desc generates geographical coordinations in relation to a given site
 * @param Site site - the site which should get new neighbor site. 
 * @return array - an array with longitude and latitude. 
*/  
var calculateGeo = function(site) {
	var distance = ((2 + 18*Math.random())*1000).toFixed(3); // range: 2-20 km
	var azimuth = (360 * Math.random()).toFixed(2);
	var input = {
		point1:site.geo,
		distance:distance,
		azimuth:azimuth
	};
	
	var geo = geoCalc.point2(input, function(err, result) {
		if (err) 
			console.error(err);
		return result;
	});	
	return geo;
};

var createSite = function(parent, numberOfLosLinks, image) {
	
	var maxWidth = image.getWidth()-1;
	var maxHeight = image.getHeight()-1;
	
	var id = network.sites.length;
	var type = (parent === null) ? 'Aggregator' : 'BaseStation';

	var geo = (parent === null) ? [longitude(),latitude()] : calculateGeo(parent);
	var x = Math.round( (geo[0]-lngMin)/(lngMax-lngMin)*maxWidth );
    var y = maxHeight -Math.round( (geo[1]-latMin)/(latMax-latMin)*maxHeight );
        
    var checkThis = [127, 127, 	127, 127]
    if (0 <= x && x<=maxWidth & 0<=y && y<=maxHeight) {
    	checkThis = image.getPixel(x, y);
    }
    
	while (checkThis[0] === 255 && checkThis[1] === 255 && checkThis[2] === 255) {
    	geo = (parent === null) ? [longitude(),latitude()] : calculateGeo(parent);
        x = Math.round( (geo[0]-lngMin)/(lngMax-lngMin)*maxWidth );
        y = maxHeight - Math.round( (geo[1]-latMin)/(latMax-latMin)*maxHeight );
        
        checkThis = [127, 127, 	127, 127]
        if (0 <= x && x<=maxWidth & 0<=y && y<=maxHeight) {
        	checkThis = image.getPixel(x, y);
        }
    }
    
	var site = {
			id: id,
			userId: type+'-'+pad(id, 5),
			type: type,
			geo: geo,
			losLinks: []
		}
	network.sites.push(site);
	
	site.networkElements = createNetworkElements(site, network);
	addLosLinks(numberOfLosLinks, site, image);
	
	return site;
};

var addLosLinks = function(numberOfLosLinks, siteA, image) {
	for (var index = 0; index < numberOfLosLinks; index++) {
		var siteB = createSite( siteA, (numberOfLosLinks-2), image );
		
		var newLosLink = {
				id:losLinkId++,
				userId: (siteA.userId + '>>' + siteB.userId),
				from: siteA.id,
				to: siteB.id
			}		
		network.losLinks.push(newLosLink);
		siteA.losLinks.push(newLosLink.id);
		
		var backLosLink = {
				id:losLinkId++,
				userId: (siteB.userId + '>>' + siteA.userId),
				from: siteB.id,
				to: siteA.id
			}	
		network.losLinks.push(backLosLink);
		siteB.losLinks.push(backLosLink.id);
	}
}

var pad = function(num, size) {
    var s = num+'';
    while (s.length < size) s = '0' + s;
    return s;
}


function formatNumber(number, digit) {
	var number = number.toFixed(digit) + '';
	var x = number.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return parseFloat(x1 + x2);
}

var writefile = function(network) {

	var out = JSON.stringify(network, null, ' ');
	fs.writeFile(config.outputFilename, out, function(err) {
	    if (err) {
	        console.log(err);
	    } else {
			var result = {
				message: 'The file \''+config.outputFilename+'\' was saved!',
		    	aggs:network.aggSiteIds.length, 
		       	sites:network.sites.length, 
		       	losLinks:network.losLinks.length, 
		       	networkElements:network.networkElements.length 
			};
		    console.log(result);
	    }
	});
}

var save = function(network) {
	
	var folder = path.dirname(config.outputFilename);
	fs.exists(folder, function (exists) {
		  if (exists) {
			  writefile(network);
		  } else {
			  fs.mkdir(folder, function(err) {
				  if (err) throw err;
				  writefile(network);
			  })
		  };
	});
}

var fillNetwork = function(count, image, callback) {

	var index = 0;
	while (index < count) {
		var newSite = createSite(null, 5, image);
	 	network.aggSiteIds.push(newSite.id);	
	 	network.sites.push(newSite);	
	 	index++;
	}
	return callback(network);
}


var getImage = function(callback) {
	
	fs.readFile(config.maps[config.selectedMap].imageUrl, function(err, buffer){
	    var reader = new PNGReader(buffer);
	    reader.parse(function(err, png){
	        if (err) throw err;	
	        return callback(png);
	    });
	});
}

// start application
getImage(function(image) {
	console.log('time: ' + (new Date() - time));
	fillNetwork(config.numberOfAggregatorSites, image, function(network) {
		console.log('time: ' + (new Date() - time));
		save(network);
		console.log('time: ' + (new Date() - time));
	});
});