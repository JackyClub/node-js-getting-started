const express = require('express')

const path = require('path')

const PORT = process.env.PORT || 3000


  express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/iot',getdata)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

function getdata(req,res)
{
  var now = new Date();
  var sec=now.getSeconds(); //0-59

  res.json ({val:sec});
}
