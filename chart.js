var focus = {
  x: 0,
  y: 0,
  detail: 2,
  speed: 0,
  zoom: 2,
  fps: 30,
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

  var sectorID = ""
  // register object IDs
  for (var bodyType in d) {
    for (var bodyID in d[bodyType]) {
      if (bodyType == "sector") {
        sectorID = bodyID
      }
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
  objectLookup.set("sector", objectLookup.get(sectorID))
  return objectLookup
}

var createGalaxy = function (objectLookup) {

  var systemGet = body => {
    if (body.parentEntity == "sector") {
      return {
        id: body.id,
        x: body.x,
        y: body.y
      }
    } else {
      return systemGet(galaxy.map.get(body.parent))
    }
  }

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
      map: map,
      systemGet: systemGet,
      get: (id) => map.get(id)
    }, swapOutChildren(objectLookup.get("sector")), {})
}

var time = 0

var diminishingScale = 0.4

var spin = (radius, speed, offset) => {
  var dist = speed * focus.spaceTime / 1000 + offset
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

      case "sector":
        return {
          x: 0,
          y: 0
        }
      case "blackHole":
      case "system":
        var halfWobble = 0.2
        return {
          x: spaceObject.x - halfWobble + 2 * halfWobble * (hash % 10) / 10,
          y: spaceObject.y - halfWobble + 2 * halfWobble * (hash % 13) / 13 + 0.5 * (spaceObject.x % 2 == 0)
        }
        break;
      case "asteroidBelt":
        var parent = galaxy.map.get(spaceObject.parent)
        var ppos = position(parent.id)
        return {
          x: ppos.x,
          y: ppos.y
        }
        break;
      default:
        if (spaceObject.parentEntity == "asteroidBelt") {
          var parent = galaxy.map.get(galaxy.map.get(spaceObject.parent).parent)
          var ppos = position(parent.id)
          var radius = childRadius(galaxy.map.get(spaceObject.parent)) * 1.05 * Math.pow(diminishingScale, spaceObject.depth - 3)
          var speed = Math.abs(1 + (galaxy.map.get(spaceObject.parent).hash % 100) / 10)
        } else {
          var parent = galaxy.map.get(spaceObject.parent)
          var ppos = position(parent.id)
          var radius = childRadius(spaceObject) * Math.pow(diminishingScale, spaceObject.depth - 2)
          var speed = Math.abs(1 + (hash % 100) / 10)
        }
        var systemSpin = 2 * (parent.hash % 2) - 1
        var oSpin = spin(radius, systemSpin * speed, hash % 3601)
        return {
          x: ppos.x + oSpin[0],
          y: ppos.y + oSpin[1]
        }
    }
  }

  const o = galaxy.map.get(objectId)
  const skewedX = dLocation(o)

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

var makeChild = (parentLocation, childId, callback) => {
  var o = galaxy.map.get(childId)
  var g = svg.group()
  var loc = position(o.id)
  g.transform(`t${loc.x},${loc.y})s${Math.pow(diminishingScale, -o.depth)}`)
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
  var min = (parent.type == "system") ? 1.5 * diminishingScale : 0.5 * diminishingScale
  var max = (parent.type == "system") ? 0.8 : 0.4
  return 0.4 * (min + (max - min) * (1 + childObject.childId + 0.9 * (childHash % 10) / 10) / (1 + parent.children.length))

}

var drawElement = (svgGroup, data) => {
  var c
  var scale = (0.9 + 0.2 * ((hashCode(data.id) % 23) / 23)) * Math.pow(diminishingScale, (data.depth - 1) / 2)
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
      var size = 0.3 + 0.1 * Math.pow((data.hash % 123) / 123, 1.5)
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
          surfaceColour = "#AAA"
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
    case "gasGiantMine":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#7E7"
      })
      break;
    case "asteroidBase":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#476"
      })
      break;
    case "refuelingStation":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#BB7"
      })
      break;
    case "researchBase":
      c = svgGroup.circle(0, 0, scale * 0.2).attr({
        fill: "#7BB"
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
      log("Hit default " + data.type)
      c = svgGroup.circle(0, 0, scale * 0.1).attr({
        fill: "white"
      })
  }
  c.attr({
    onclick: `updateBodySelection("${data.id}")`
  })
}


var updateSvg = function () {


  for (keypair of galaxy.map) {
    var o = keypair[1]
    var g = svg.select("#group" + keypair[0])
    var d = Math.pow(diminishingScale, o.depth)
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

  var viewWidth = Math.max(1 / focus.zoom, 0.001)
  var viewHeight = Math.max(1 / focus.zoom, 0.001)
  var left = focus.x - viewWidth / 2
  var top = focus.y - viewHeight / 2

  if (focus.x === NaN) {
    focus.x = 0
  }
  if (focus.y === NaN) {
    focus.y = 0
  }

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
  if (galaxy) {
    var delta = timeStamp - lastUpdate
    if (delta > (1000 / focus.fps)) {
      if (drag.focusTime > 0) {

        drag.focusTime = Math.max(0, drag.focusTime - delta)
        var dx = drag.focusTarget.x - focus.x
        var dy = drag.focusTarget.y - focus.y
        var dDist = Math.sqrt(dx * dx + dy * dy)
        var dist = Math.min(dDist, drag.focusSpeed * delta)
        if (dist > 0.0000001) {
          setFocus(focus.x + dist * dx / dDist, focus.y + dist * dy / dDist)
        }
        focus.zoom += drag.zoomSpeed * delta
        setZoom(null)

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



  window.requestAnimationFrame(redraw)

})

var loadData = d => {
  galaxy = null

  dirty()
  var objectLookup = createLookup(d)
  galaxy = createGalaxy(objectLookup)
  initialiseSvg()
}

var loadURL = u => {
  $.getJSON(u, function (d) {
    loadData(d)
  })
}