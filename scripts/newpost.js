const { DateTime } = require('luxon');
const fs = require('fs')
const path = require('path')

function main() {
  const now = DateTime.now().setZone('Asia/Tokyo')
  const fileName = now.toFormat('yyyyMMdd')
  const blogPostPath = path.join(__dirname, "../content/blog/", `${fileName}.md`)
  const blogPostBody = [
    '---',
    'title: "Hello World"',
    `date: "${now.toString()}"`,
    `description: "Hello World"`,
    '---'
  ].join("\n")

  fs.writeFile(blogPostPath, blogPostBody, (err) => {
    if (err) throw err
    console.log(`${blogPostPath}`)
  })
}

main()
