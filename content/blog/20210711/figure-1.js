const canvas = document.getElementById("figure-1")
const ctx = canvas.getContext("2d")

const x = canvas.width / 2     // x座標の中心
const y = canvas.height / 2    // y座標の中心

ctx.strokeStyle = "#282828"
ctx.lineWidth = 4

ctx.fillStyle = "#ab4642"

ctx.beginPath()
ctx.moveTo(x, y)
ctx.arc(x, y,
        Math.min(x, y) * 0.9, // 半径
        Math.PI * -0.5,       // 90°
        Math.PI * 0,          // 180°
        false)                // 時計回り
ctx.lineTo(x, y)
ctx.stroke()
ctx.fill()
