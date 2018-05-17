var focus = {
  x: 50,
  y: 50,
  detail: 2,
  speed: 1,
  zoom: 50,
  fps: 15,
  tilt: 30,
  spaceTime: 100
}

var tiltMatrix = new Snap.Matrix()

var galaxy

var createLookup = function (d) {
  var objectLookup = new Map()
  // register object IDs
  for (var bodyType in d) {
    for (var bodyID in d[bodyType]) {
      var objectReference = Object.assign({
        type: bodyType,
        id: bodyID
      }, d[bodyType][bodyID], {})
      objectLookup.set(bodyID, objectReference)
    }
  }


  for (var bodyType in d) {
    for (var bodyID in d[bodyType]) {
      var parentID = objectLookup.get(bodyID).parent
      var parentOb = objectLookup.get(parentID)
      if (typeof (parentOb) != "undefined") {
        if (typeof (parentOb.children) == "undefined") {
          parentOb.children = []
        }
        parentOb.children.push(bodyID)
        objectLookup.set(parentID, parentOb)
      }
    }
  }
  return objectLookup
}

var createGalaxy = function (objectLookup) {

  var map = new Map()

  var swapOutChildren = (o => {
    if (typeof (o.children) != "undefined") {
      for (var i = 0; i < o.children.length; i++) {
        var replacement = swapOutChildren(Object.assign({
          childId: i,
          depth: (o.depth || 0) + 1,
          hash: hashCode(o.children[i])
        }, objectLookup.get(o.children[i]), {}))

        map.set(o.children[i], replacement)
        o.children[i] = replacement
      }
    }
    return o
  })

  return Object.assign({
    map: map
  }, swapOutChildren(objectLookup.get("m11ZXBOt6xiJGo21EKio")), {})
}

var time = 0

var diminishingScale = 0.4

var spin = (radius, speed, offset) => {
  var dist = speed * focus.spaceTime / 1000
  return [radius * Math.cos(dist), radius * Math.sin(dist)]
}

var position = objectId => {

  var ySkew = tiltMatrix.d
  var dLocation = spaceObject => {
    if (typeof (spaceObject) == "undefined") {
      return {
        x: 0,
        y: 0
      }
    }
    // Need just x, y
    var hash = spaceObject.hash
    switch (spaceObject.type) {

      case "asteroidBelt":
      case "sector":
        return {
          x: 0,
          y: 0
        }
      case "blackHole":
      case "system":
        var topSqueeze = Math.cos(focus.tilt * Math.PI / 180)
        var distUp = 1 - (spaceObject.y / galaxy.rows)
        var midSqueeze = (1 - distUp) + distUp * topSqueeze
        var rawX = spaceObject.x - 0.05 + 0.1 * (hash % 10) / 10
        return {
          x: midSqueeze * rawX + (1 - midSqueeze) * galaxy.columns / 2,
          y: spaceObject.y - 0.05 + 0.1 * (hash % 10) / 10 - 0.5 * (spaceObject.x % 2)
        }
        break;
      default:
        var parent = galaxy.map.get(spaceObject.parent)
        var radius = childRadius(spaceObject) / diminishingScale
        var oSpin = spin(radius, (2 * (hashCode(parent.id) % 2) - 1) * Math.abs(1 + (hash % 100) / 10), hash % 3601)
        return {
          x: oSpin[0],
          y: oSpin[1]
        }
    }
  }

  const skewedX = dLocation(galaxy.map.get(objectId))

  return {
    x: skewedX.x,
    y: skewedX.y * ySkew
  }
}

var hashCode = function (string) {
  var hash = 0,
    i, chr;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash); // abs, so it plays well with modulo
}

var makeChild = (parentSVG, childId, callback) => {
  var o = galaxy.map.get(childId)
  var g = parentSVG.group()
  var loc = position(o.id)
  g.transform(`t${loc.x},${loc.y})s${diminishingScale}`)
  drawElement(g, o)
  g.attr({
    id: "group" + childId,
    style: "will-change: transform;"
  })
  if (typeof (o.children) != "undefined") {
    o.children.forEach(c => {
      callback(g, c.id, callback)
    })
  }
  return g
}

var childRadius = childObject => {
  var parent = galaxy.map.get(childObject.parent)
  var childHash = hashCode(childObject.id)
  var parentHash = hashCode(parent.id)
  // want some randomness?
  // Too computationally expensive for the effect
  // Need to find a suitable base
  // var shuffle = Math.pow(base, (parentHash % 13) * childObject.childId) % parent.children.length

  // max radius value is 0.5, because we want galaxies of approximate width 1
  return 0.5 * (diminishingScale + (1 - diminishingScale) * (1 + childObject.childId + 0.9 * (childHash % 10) / 10) / (1 + parent.children.length))

}

var drawElement = (svgGroup, data) => {
  var c
  var scale = 0.9 + 0.2 * ((hashCode(data.id) % 23) / 23)
  switch (data.type) {
    case "blackHole":
      c = svgGroup.circle(0, 0, scale * 0.3)
      break;
    case "deepSpaceStation":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#644"
      })
      break;
    case "system":
      var bv = (5.2) * ((data.hash % 123) / 123) - 0.5
      var size = 0.1 + 0.1 * Math.pow((data.hash % 123) / 123, 1.5)
      var finalColour = bv_to_rgb(bv)
      c = svgGroup.circle(0, 0, scale * size).attr({
        fill: finalColour //svg.gradient(`r(0.5, 0.5, 0.5)#fff-#${finalColour}`)
      })
      break;
    case "planet":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "green"
      })
      break;
    case "moon":
    case "moonBase":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#BBB"
      })
      break;
    case "orbitalRuin":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#666"
      })
      break;
    case "spaceStation":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#EEE"
      })
      break;
    case "asteroidBelt":
      c = svgGroup.circle(0, 0, childRadius(data) / (diminishingScale * diminishingScale)).attr({
        fill: "none",
        stroke: "grey",
        "stroke-width": scale * 0.01
      })
      break;
    default:
      c = svgGroup.circle(0, 0, scale * 0.1).attr({
        fill: "white"
      })
  }
  c.attr({
    onclick: `updateBodySelection("${data.id}")`
  })
}


var updateSvg = function () {

  var galaxyWidth = galaxy.columns
  var galaxyHeight = galaxy.rows

  var viewWidth = Math.pow(tiltMatrix.d,0.5) * (1 - (focus.zoom / 100)) * (galaxyWidth + 2)
  var viewHeight = Math.pow(tiltMatrix.d,0.5) * (1 - (focus.zoom / 100)) * (galaxyHeight + 2)
  var left = galaxyWidth * focus.x / 100 - viewWidth / 2
  var top = galaxyWidth * (focus.y / 100) * tiltMatrix.d - viewHeight / 2

  svg.attr({
    viewBox: `${left}, ${top}, ${viewWidth}, ${viewHeight}`
  })


  for (keypair of galaxy.map) {
    var o = keypair[1]
    var g = svg.select("#group" + keypair[0])
    if (g) {
      // Some bodies won't have been drawn, so check for null svg element
      var visible = (o.depth <= focus.detail)
      if (visible) {
        var loc = position(o.id)
        var d = diminishingScale
        var distFromFocus = (g.transform().globalMatrix.f / mapSize - focus.y / 100) * tiltMatrix.d
        var distScale = 0.5 + 0.25 * distFromFocus

        switch (o.type) {
          case "asteroidBelt":
            g.transform(`m ${d* distScale}, 0, 0, ${d * tiltMatrix.d * distScale}, ${loc.x}, ${loc.y}`)
            break;
          default:
            g.transform(`m ${d* distScale}, 0, 0, ${d* distScale}, ${loc.x}, ${loc.y}`)

        }
        g.attr({
          visibility: "visible"
        })
      } else {
        g.attr({
          visibility: "hidden"
        })
      }
    }
  }
}

var initialiseSvg = function () {

  const galaxyWidth = galaxy.columns
  const galaxyHeight = galaxy.rows

  const viewWidth = (1 - (focus.zoom / 100)) * (galaxyWidth + 2)
  const viewHeight = (1 - (focus.zoom / 100)) * (galaxyHeight + 2)
  const left = galaxyWidth * focus.x / 100 - viewWidth / 2
  const top = galaxyWidth * (focus.y / 100) * tiltMatrix.d - viewHeight / 2

  svg.clear()
  svg.attr({
    viewBox: `${left}, ${top}, ${viewWidth}, ${viewHeight}`
  })

  // background
  svg.rect(-1, -1, galaxyWidth + 2, galaxyHeight + 2).attr({
    fill: "none"
  })

  const svgGalaxy = svg.g()
    .attr({
      "font-family": "sans-serif",
      "font-size": 10
    })


  for (var i = 0; i < galaxy.children.length; i++) {
    var c = galaxy.children[i]
    makeChild(svgGalaxy, c.id, makeChild)
  }


}

var updateTilt = () => {
  tiltMatrix.d = Math.cos((focus.tilt) * Math.PI / 180)
}


var svg
var baseTime = (new Date()).getTime()
var lastUpdate = null
var redraw = (timeStamp) => {
  if (timeStamp - lastUpdate > (1000 / focus.fps)) {
    lastUpdate = timeStamp
    focus.spaceTime = focus.spaceTime + focus.speed
    updateSvg()
    /*svgPanZoom('#chart', {
      zoomEnabled: true,
      controlIconsEnabled: true,
      fit: true,
      center: true,
    })*/
  }
  window.requestAnimationFrame(redraw)
}

const mapSize = 400

$(function () {

  svg = Snap(mapSize, mapSize)
  svg.attr({
    id: "chart",
    width: "100%",
    height: "100%"
  })

  addSvgTouchHandlers()




  $.getJSON("./AcheronRho.json", function (d) {
    var objectLookup = createLookup(d)
    galaxy = createGalaxy(objectLookup)
    initialiseSvg()
    window.requestAnimationFrame(redraw)
  })
})