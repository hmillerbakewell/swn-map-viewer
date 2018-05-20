var focus = {
  x: 0,
  y: 0,
  detail: 1,
  speed: 0,
  zoom: 2,
  fps: 15,
  dirty: true,
  spaceTime: (new Date()).getTime(),
  systemToXY: (sx, sy) => {
    var rx = Math.round(sx)
    return {
      x: sx + galaxy.columns / 2,
      y: sy - 0.5 * (rx % 2)
    }
  }
}

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

var diminishingScale = 0.3

var spin = (radius, speed, offset) => {
  var dist = speed * focus.spaceTime / 1000
  return [radius * Math.cos(dist), radius * Math.sin(dist)]
}

var position = objectId => {

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
        return {
          x: spaceObject.x - 0.05 + 0.1 * (hash % 10) / 10,
          y: spaceObject.y - 0.05 + 0.1 * (hash % 13) / 13
        }
        break;
      default:
        var parent = galaxy.map.get(spaceObject.parent)
        var radius = childRadius(spaceObject) / diminishingScale
        if (spaceObject.parentEntity == "asteroidBelt") {
          radius = 1 / childRadius(galaxy.map.get(spaceObject.parent))
        }
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
    y: skewedX.y
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
      var midColour = "#FFFFFF"
      var finalColour = bv_to_rgb(bv)
      c = svgGroup.circle(0, 0, scale * size).attr({
        fill: svg.gradient(`r(0.5, 0.5, 0.5)${midColour}-${midColour}:25-${finalColour}`)
      })
      break;
    case "planet":
      var surfaceColour = null
      switch (data.attributes.biosphere) {
        case "humanMiscible":
          surfaceColour = "#AADDFF"
          break;
        case "remnant":
          surfaceColour = "#BB88DD"
          break;
        case "none":
          surfaceColour = "#999999"
          break;
        case "engineered":
          surfaceColour = "#AAEEEE"
          break;
        case "hybrid":
          surfaceColour = "#EE5555"
          break;
        case "microbial":
          surfaceColour = "#55EE55"
          break;
        case "immiscible":
          surfaceColour = "#FFAAAA"
          break;
        default:
          log(`Biosphere unspecified: ${data.attributes.biosphere}`)
      }
      var atmoshphereColour = null
      switch (data.attributes.atmosphere) {
        case "breathable":
          atomsphereColour = "#ADD8E6"
          break;
        case "corrosive":
          atomsphereColour = "#EEBB99"
          break;
        case "thick":
          atomsphereColour = "#AAAAFF"
          break;
        case "inert":
          atomsphereColour = surfaceColour
          break;
        case "corrosiveInvasive":
          atomsphereColour = "#AA5533"
          break;
        case "airlessThin":
          atomsphereColour = "#DDDDFF"
          break;
        case "invasive":
          atomsphereColour = "#333333"
          break;
        default:
          log(`Atmosphere unspecified: ${data.attributes.atmosphere}`)
      }
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: svg.gradient(`r(0.5, 0.5, 0.5)${surfaceColour}-${surfaceColour}:50-${atomsphereColour}`)
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
        "stroke-width": scale * 0.08
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

  var d = diminishingScale

  for (keypair of galaxy.map) {
    var o = keypair[1]
    var g = svg.select("#group" + keypair[0])
    if (g) {
      // Some bodies won't have been drawn, so check for null svg element
      var visible = (o.depth <= focus.detail)
      if (visible) {
        var loc = position(o.id)
        g.transform(`m ${d}, 0, 0, ${d}, ${loc.x}, ${loc.y}`)

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

var updateViewPort = () => {

  var galaxyWidth = galaxy.columns
  var galaxyHeight = galaxy.rows

  var viewWidth = focus.zoom
  var viewHeight = focus.zoom
  var left = focus.x - viewWidth / 2
  var top = focus.y - viewHeight / 2

  var viewBoxStr = `${left} ${top} ${viewWidth} ${viewHeight}`

  if (!svg.attr("viewBox") || svg.attr("viewBox").vb != viewBoxStr) {
    svg.attr({
      viewBox: viewBoxStr
    })
  }
}

var touchSvg = () => {
  svg.attr({
    visibility: "visibile"
  })
}

var initialiseSvg = function () {

  const galaxyWidth = galaxy.columns
  const galaxyHeight = galaxy.rows

  focus.x = galaxyWidth / 2
  focus.y = galaxyHeight / 2

  svg.clear()
  updateViewPort()

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

var svg
var baseTime = (new Date()).getTime()
var lastUpdate = null
var redraw = (timeStamp) => {
  var delta = timeStamp - lastUpdate
  if (delta > (1000 / focus.fps)) {
    if (drag.focusTime > 0) {

      drag.focusTime = Math.max(0, drag.focusTime - delta)
      var dx = drag.focusTarget.x - focus.x
      var dy = drag.focusTarget.y - focus.y
      var dDist = Math.sqrt(dx * dx + dy * dy)
      var dist = Math.min(dDist, drag.focusSpeed * delta)
      setFocus(focus.x + dist * dx / dDist, focus.y + dist * dy / dDist)

    }
    lastUpdate = timeStamp
    focus.spaceTime = focus.spaceTime + focus.speed
    if (focus.dirty || focus.speed > 0) {
      updateSvg()
      focus.dirty = false
    }
    updateViewPort()
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