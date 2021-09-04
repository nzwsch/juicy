const rouletteAnimation = () =>
  new Promise(done => {
    let count = 0

    console.log("roulette start", count)

    setTimeout(() => {
      console.log("roulette end", ++count)
      done(count)
    }, 1000)
  })

const blinkAnimation = count =>
  new Promise(done => {
    console.log("blink start", count)

    setTimeout(() => {
      console.log("blink end", ++count)
      done()
    }, 1000)
  })

console.log("animation start")
rouletteAnimation()
  .then(count => blinkAnimation(count))
  .then(() => console.log("animation end"))
