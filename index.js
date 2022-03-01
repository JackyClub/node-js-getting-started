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
  .get('/iot/view', (req, res) => res.render('pages/view'))
  .get('/iot',getdata)
  .get('/iot/hist',gethistory)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


var queue=[];
var NUM=20;
function getdata(req,res)
{
  console.log(req.query)
  var bound=100;
  if(req.query!=undefined && req.query.bound!=undefined)
  bound=req.query.bound;
  var val=0;
  do
  {
    val=Math.floor(Math.random()*(bound*2+1))-bound;
    queue.push(val);
  }while((queue.length<NUM));

  if(queue.length>NUM)
    queue.shift();
  res.json ({"val":val});
}

function gethistory(req,res)
{
  var bound=100;
  while(queue.length<NUM)
    queue.push(Math.floor(Math.random()*(bound*2+1))-bound);

    res.json ({"data":queue});
}
