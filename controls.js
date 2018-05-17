var markdown = new showdown.Converter()
var log = console.log


updateBodySelection = (bodyId) => {

  if (bodyId && bodyId.length > 0) {
    var getDescription = () => {
      var o = galaxy.map.get(bodyId)
      if (typeof (o) != "undefined") {
        var s = `# ${details(o.id)}
${attributes(o.attributes)}`
        if (o.parentEntity != "sector") {
          s += `
## Parent ${details(o.parent)}`
        }
        return s
      }
    }

    $(".details").show()
    $("#detailsWords").html(markdown.makeHtml(getDescription()))
  } else {
    $(".details").hide()
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
  last: null
}

var constrain = (min, val, max) => {
  return Math.min(Math.max(min, val), max)
}

var addSvgTouchHandlers = () => {

  var shiftFocus = (x, y) => {
    focus.x = constrain(0, focus.x - focus.zoom * (x) / 1000, 100)
    focus.y = constrain(0, focus.y - focus.zoom * (y) / 1000, 100)

  }

  var shiftZoom = (z) => {
    focus.zoom = constrain(1, focus.zoom + z / 10, 99)
  }

  var shiftTilt = (t) => {
    focus.tilt = constrain(15, focus.tilt + t / 10, 90)
    updateTilt()
  }


  var updateTilt = () => {
    tiltMatrix.d = Math.cos((focus.tilt) * Math.PI / 180)
  }

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
  });
  $("svg").on('touchend', function () {
    drag.blockScroll = false;
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
          shiftZoom(distYChange)
          shiftTilt(avgYChange)
        }
      }
    }
    drag.last = touches
  })
}