const express = require('express')

const cors = require('cors');

const path = require('path')

const PORT = process.env.PORT || 3000


  express()
  .use(cors())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/iot',getdata)
  .get('/iot/hist',gethistory)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


var queue=[];

function getdata(req,res)
{
  console.log(req.query)
  var bound=100;
  if(req.query!=undefined && req.query.bound!=undefined)
    max=req.query.bound;
  var val=Math.floor(Math.random()*(max*2+1))-max;
  if(queue.length>10)
    queue.shift();
  queue.push(val);
  res.json ({"val":val});
}

function gethistory(req,res)
{

  res.json ({"data":queue});
}
