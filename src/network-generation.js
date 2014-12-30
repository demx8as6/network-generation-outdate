'use strict';
var fs = require('fs');
var geoCalc = require('geo-calculator');

var time = new Date()
console.log(time);

var germany =   [10.3, 51.1];
var dimension = [ 8.6,  6.4];
var aggCount = 1000;
var maxNEsPerSite = 6;

var siteId = 0;
var losLinkId = 0;
var networkElementId = 0;	

var createNetworkElements = function(site) {
	var networkElements = [];
	var neId = 0;
	var count = Math.random()*maxNEsPerSite;
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

var distance = { ranges:[
	{from:1000, to:3000, likly:0.80},
	{from:3000, to:10000, likly:0.15},
	{from:10000, to:40000, likly:0.85},
], units:'m'}; 

var longitude = function() {
	var longitude = germany[0] + dimension[0]*(Math.random() - 1/2);
	return formatNumber(longitude, 6);
};

var latitude = function() {
	var latitude  = germany[1] + dimension[1]*(Math.random() - 1/2);
	return formatNumber(latitude, 6);
};

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

var createSite = function(parent, numberOfLosLinks) {
	
	var id = network.sites.length;
	var type = (parent === null) ? 'Aggregator' : 'BaseStation';
	var geo = (parent === null) ? [longitude(),latitude()] : calculateGeo(parent);
	
	var site = {
			id: id,
			userId: type+'-'+pad(id, 5),
			type: type,
			geo: geo,
			losLinks: []
		}
	network.sites.push(site);
	
	site.networkElements = createNetworkElements(site);
	addLosLinks(numberOfLosLinks, site);
	
	return site;
};

var addLosLinks = function(numberOfLosLinks, siteA) {
	for (var index = 0; index < numberOfLosLinks; index++) {
		var siteB = createSite( siteA, (numberOfLosLinks-2) );
		
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


// los


var network = {
	aggSiteIds: [],
	sites: [],
	losLinks: [],
	networkElements: []
};

var fillNetwork = function(count) {

	var index = 0;
	while (index < count) {
		var newSite = createSite(null, 5);
	 	network.aggSiteIds.push(newSite.id);	
	 	network.sites.push(newSite);	
	 	index++;
	}
}

fillNetwork(aggCount);

var fileNames = ['network.json'];
var out = JSON.stringify(network, null, ' ');

fs.writeFile(fileNames[0], out, function(err) {
    if (err) {
        console.log(err);
    } else {
		var data = {
			message: "The file '"+fileNames[0]+"' was saved!",
	    	aggs:network.aggSiteIds.length, 
	       	sites:network.sites.length, 
	       	losLinks:network.losLinks.length, 
	       	networkElements:network.networkElements.length 
		};
	    console.log(data);
    }
});

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