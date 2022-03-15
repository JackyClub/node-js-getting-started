const express = require('express');

const request = require('request');

const https = require('https');

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
  .get('/iot/dashboard', (req, res) => res.render('pages/dashboard'))
  .get('/iot',getdata)
  .get('/iot/control',control)
  .get('/iot/control/:did',control)
  .post('/iot/control',control)
  .get('/iot/nosie',get_sin_data)
  .get('/iot/sin',get_sin_data)
  .get('/iot/tan',get_tan_data)
  .get('/iot/temperature',get_temperature)
  .get('/iot/hist',gethistory)
  .get('/iot/list',get_device_list)
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
///////////////////////////////////////////////////
var controlArray=[
  {did:"room1",status:true,value:70},
  {did:"room2",status:true,value:60},
  {did:"room3",status:true,value:50}
];

function control(req,res)
{
 // console.log(req)
  if(req.method != undefined)
  {
    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////
    if(req.method=="GET")
    {
      if(req.params!= undefined && req.params.did!=undefined)
      {
        key=req.params.did;
        var result=controlArray.find(e=>e.did==key);
        console.log("Object:" + result );
        res.json(result==undefined?{}:result);
      }
      else
      {
        controlArray.forEach(element => {
          console.log(element)
        });

        res.json(controlArray);
      }
    }
    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////
    else if(req.method=="POST")
    {
      var body='';
      req.on('data',(chunk)=>{
        body+=chunk;
        if(body.length>1e4) //1e4-10kB, 1e6-1MB
          req.connection.destory();
      });
      req.on('end',()=>{
        body=JSON.parse(body);
        if(body.length==undefined)
          body=[body];
        body.forEach(element => {
          if(element.did != undefined && (element.status!=undefined || element.value!=undefined))
          {
            //JSON.filter = require('node-json-filter');
            console.log('loop item:'+element.did)

            var result=controlArray.find(e=>e.did==element.did);
            if(result!=undefined) //update
            {
              console.log("update");
              if(element.did!=undefined)
                result.did=element.did;
              if(element.status!=undefined)
                result.status=element.status;
              if(element.value!=undefined)
                result.value=element.value;
              result.timestamp=new Date();
              result.lastAcion="update";

            }else //add
            {
              console.log("add");
              element.timestamp=new Date();
              element.lastAcion="add";
              controlArray.push(element)
            }
          }

        });
        res.json(controlArray);
      });
    }
    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////
  }
}

///////////////////////////////////////////////////
function get_sin_data(req,res)
{
  let now=new Date();
  let hours=now.getHours();
  let minutes=now.getMinutes();
  let seconds=now.getSeconds();
  let val=36+20*Math.sin(hours*Math.PI/12)+
  15*Math.sin(minutes*Math.PI/30)+
  10*Math.sin(seconds*Math.PI/30)

  res.json ({"val":val,"timestamp":now});
}

function get_tan_data(req,res)
{
  let now=new Date();
  let hours=now.getHours();
  let minutes=now.getMinutes();
  let seconds=now.getSeconds();
  let val=30*Math.tan((seconds/61)*(Math.PI/4))

  res.json ({"val":val,"timestamp":now});
}

function gethistory(req,res)
{
  var bound=100;
  while(queue.length<NUM)
    queue.push(Math.floor(Math.random()*(bound*2+1))-bound);

    res.json ({"data":queue});
}

function get_temperature(req,res)
{

  request('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en', { json: true }, 
  (err, res2, body2) => 
  {
    if (err)
        return console.log(err);
        /*
    var result={rainfall:{data:[{unit:"mm",place:"Central &amp; Western District",max:0,main:"FALSE"},{"unit":"mm","place":"Eastern District","max":0,"main":"FALSE"},{"unit":"mm","place":"Kwai Tsing","max":0,"main":"FALSE"},{"unit":"mm","place":"Islands District","max":0,"main":"FALSE"},{"unit":"mm","place":"North District","max":0,"main":"FALSE"},{"unit":"mm","place":"Sai Kung","max":0,"main":"FALSE"},{"unit":"mm","place":"Sha Tin","max":0,"main":"FALSE"},{"unit":"mm","place":"Southern District","max":0,"main":"FALSE"},{"unit":"mm","place":"Tai Po","max":0,"main":"FALSE"},{"unit":"mm","place":"Tsuen Wan","max":0,"main":"FALSE"},{"unit":"mm","place":"Tuen Mun","max":0,"main":"FALSE"},{"unit":"mm","place":"Wan Chai","max":0,"main":"FALSE"},{"unit":"mm","place":"Yuen Long","max":0,"main":"FALSE"},{"unit":"mm","place":"Yau Tsim Mong","max":0,"main":"FALSE"},{"unit":"mm","place":"Sham Shui Po","max":0,"main":"FALSE"},{"unit":"mm","place":"Kowloon City","max":0,"main":"FALSE"},{"unit":"mm","place":"Wong Tai Sin","max":0,"main":"FALSE"},{"unit":"mm","place":"Kwun Tong","max":0,"main":"FALSE"}],"startTime":"2022-03-14T16:45:00+08:00","endTime":"2022-03-14T17:45:00+08:00"},"icon":[77],"iconUpdateTime":"2022-03-14T18:00:00+08:00","uvindex":{"data":[{"place":"King's Park","value":0.4,"desc":"low"}],"recordDesc":"During the past hour"},"updateTime":"2022-03-14T18:02:00+08:00","temperature":{"data":[{"place":"King's Park","value":25,"unit":"C"},{"place":"Hong Kong Observatory","value":26,"unit":"C"},{"place":"Wong Chuk Hang","value":24,"unit":"C"},{"place":"Ta Kwu Ling","value":27,"unit":"C"},{"place":"Lau Fau Shan","value":26,"unit":"C"},{"place":"Tai Po","value":26,"unit":"C"},{"place":"Sha Tin","value":26,"unit":"C"},{"place":"Tuen Mun","value":25,"unit":"C"},{"place":"Tseung Kwan O","value":25,"unit":"C"},{"place":"Sai Kung","value":23,"unit":"C"},{"place":"Cheung Chau","value":23,"unit":"C"},{"place":"Chek Lap Kok","value":27,"unit":"C"},{"place":"Tsing Yi","value":25,"unit":"C"},{"place":"Shek Kong","value":27,"unit":"C"},{"place":"Tsuen Wan Ho Koon","value":24,"unit":"C"},{"place":"Tsuen Wan Shing Mun Valley","value":25,"unit":"C"},{"place":"Hong Kong Park","value":25,"unit":"C"},{"place":"Shau Kei Wan","value":22,"unit":"C"},{"place":"Kowloon City","value":26,"unit":"C"},{"place":"Happy Valley","value":26,"unit":"C"},{"place":"Wong Tai Sin","value":27,"unit":"C"},{"place":"Stanley","value":23,"unit":"C"},{"place":"Kwun Tong","value":26,"unit":"C"},{"place":"Sham Shui Po","value":25,"unit":"C"},{"place":"Kai Tak Runway Park","value":23,"unit":"C"},{"place":"Yuen Long Park","value":27,"unit":"C"},{"place":"Tai Mei Tuk","value":26,"unit":"C"}],"recordTime":"2022-03-14T18:00:00+08:00"},"warningMessage":"","mintempFrom00To09":"","rainfallFrom00To12":"","rainfallLastMonth":"","rainfallJanuaryToLastMonth":"","tcmessage":"","humidity":{"recordTime":"2022-03-14T18:00:00+08:00","data":[{"unit":"percent","value":70,"place":"Hong Kong Observatory"}]}};
    */
   var myresult;
 //   myresult.place=result.rainfall.data.
    res.json(body2)
//https://www.hko.gov.hk/images/HKOWxIconOutline/pic50.png
  });
}

var devices={};
function get_device_list(req,res)
{

}

//
