var markdown = new showdown.Converter()
var log = console.log


updateBodySelection = (bodyId) => {

  if (bodyId && bodyId.length > 0) {
    var getDescription = () => {
      var o = galaxy.map.get(bodyId)

      var systemGet = body => {
        if(body.parentEntity == "sector"){
          return {x: body.x, y: body.y}
        } else {
          return systemGet(galaxy.map.get(body.parent))
        }
      }

      var system = systemGet(o)

      if (typeof (o) != "undefined") {
        var s = `# ${details(o.id)}
${attributes(o.attributes)}`
        if (o.parentEntity != "sector") {
          s += `
## Parent ${details(o.parent)}
`
        }
        s+=`

        (System ${system.x}-${system.y})
        `
        return s
      }
    }

    $("#details").show()
    $("#detailsWords").html(markdown.makeHtml(getDescription()))
  } else {
    $("#details").hide()
  }

}

$(function () {
  var s = `
- Click an object to show details.
  
- Drag the map around.`
  $("#detailsWords").html(markdown.makeHtml(s))
})


var spreadCamel = s => {

  var dSpreadCamel = s => {
    if (typeof (s) == "string") {
      return s.replace(/([a-z])([A-Z])/g, function (m, a, b) {
        return `${a} ${b.toLowerCase()}`
      })
    } else {
      var t = []
      s.forEach(x => t.push(dSpreadCamel(x)))
      return t.join(", ")
    }
  }

  return dSpreadCamel(s)
}

var details = id => {
  function capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  var o = galaxy.map.get(id)
  if (typeof (o) != "undefined") {
    var description = attributes.description || ""
    if (description.length > 0) {
      description = " (" + description + ")"
    }
    var type = spreadCamel(o.type)
    return `${capitalise(type)}: ${o.name}${description}`
  } else {
    return ``
  }
}

var attributes = a => {

  var attr = a || {}
  var s = ""
  for (var key in a) {
    s += `- ${spreadCamel(key)}: ${spreadCamel(a[key])}\n`
  }
  return s
}



// scroll blocking from https://stackoverflow.com/questions/3957017/jquery-if-target-is-child-of-wrapper-then-do-something

var drag = {
  blockScroll: false,
  last: null,
  oldDetail: null
}

var constrain = (min, val, max) => {
  if(val === NaN){
    val = 0
  }
  return Math.min(Math.max(min, val), max)
}

var addSvgTouchHandlers = () => {

  var shiftFocus = (x, y) => {
    focus.x = constrain(0, focus.x - Math.pow(focus.zoom,1.2) * (x) / (mapSize * 10), 100)
    focus.y = constrain(0, focus.y - Math.pow(focus.zoom,1.2) * (y) / (mapSize * 10), 100)

  }

  var setZoom = (z) => {
    focus.zoom = constrain(20, z, 95)
    $("#optionZoom")[0].value = focus.zoom
  }

  var setTilt = (t) => {
    focus.tilt = constrain(0, t, 80)
    updateTilt()
    $("#optionTilt")[0].value = focus.tilt
  }

  // Options menu

  $("#optionLOD").change(function(e){
    focus.detail = parseInt($("#optionLOD")[0].value)
  })

  $("#optionLOD").change()

  $("#optionTilt").change(function(e){
    setTilt(parseInt($("#optionTilt")[0].value))
  })

  $("#optionTilt").change()

  
  $("#optionZoom").change(function(e){
    setZoom(parseInt($("#optionZoom")[0].value))
  })

  $("#optionZoom").change()


// Touch and drag

  $("svg")
    .mousedown(function (e) {
      drag.blockScroll = true
      drag.last = {
        x: e.pageX,
        y: e.pageY
      };
    })
    .mousemove(function (e) {
      var last = drag.last
      var next = {
        x: e.pageX,
        y: e.pageY
      }

      if (drag.blockScroll) {
        e.preventDefault();
        shiftFocus(next.x - last.x, next.y - last.y)
      }


      drag.last = {
        x: e.pageX,
        y: e.pageY
      }
    })
    .mouseup(function (e) {
      drag.blockScroll = false
    })


  $("svg").on('touchstart', function (e) {
    drag.blockScroll = true;
    var touches = e.targetTouches
    drag.last = e.touches
    //drag.oldDetail = focus.detail
    //focus.detail = 2
  });
  $("svg").on('touchend', function () {
    drag.blockScroll = false;
    // Not firing on multitouch end :(
    //focus.detail = drag.oldDetail
  });
  $("svg").on('touchmove', function (e) {
    var touches = e.targetTouches
    var last = drag.last
    if (drag.blockScroll) {
      e.preventDefault();

      if (last.length == touches.length) {
        if (last.length == 1) {
          var diff = {
            x: last[0].pageX - touches[0].pageX,
            y: last[0].pageY - touches[0].pageY
          }
          shiftFocus(-diff.x, -diff.y)
        }

        if (last.length == 2) {
          avgYChange = (last[0].pageY + last[1].pageY - touches[0].pageY - touches[1].pageY) / 2
          distYChange = Math.abs(touches[1].pageY - touches[0].pageY) - Math.abs(last[1].pageY - last[0].pageY)
          setZoom(focus.zoom + distYChange/10)
          setTilt(focus.tilt + avgYChange/10)
        }
      }
    }
    drag.last = touches
  })
}