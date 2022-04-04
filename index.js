const swaggerUi = require('swagger-ui-express')

const swaggerFile = require('./swagger_output.json')

const express = require('express');

const request = require('request');

const https = require('https');

const cors = require('cors');

const path = require('path');
const { setTimeout } = require('timers');

const uuid = require('uuid'); 

const PORT = process.env.PORT || 3000
const REMOTE_HOST = process.env.REMOTE_HOST || 'http://127.0.0.1:3000/iot/proxy' //'https://data-hubs.herokuapp.com/iot/proxy'

const app=express()
  app.use(cors())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')

  .get('/', (req, res) => res.render('pages/index'))
  .get('/iot/view', (req, res) => res.render('pages/view'))
  .get('/iot/dashboard', (req, res) => res.render('pages/dashboard'))
  .get('/iot',getdata)

/*
  .get('/iot/control',control)
  .get('/iot/control/:did',control)
  .post('/iot/control',control)
  */

  .get('/iot/noise',get_sin_data)
  .get('/iot/sin',get_sin_data)
  
  .get('/iot/power',get_tan_data)
  .get('/iot/tan',get_tan_data)
  
  .get('/iot/temperature',get_temperature)
  .get('/iot/hist',gethistory)
 
  .get('/iot/proxy/queue',get_queue)
  .use(request_info_log)
  .post('/iot/proxy/job/:jid',proxy_reply)

  .get('/iot/proxy/:sid',request_to_proxy)
  .get('/iot/proxy/:sid/:did',request_to_proxy)
  .post('/iot/proxy/:sid',request_to_proxy)
  .post('/iot/proxy/:sid/:did',request_to_proxy)

  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

// const app = require('express')()
/*  const http = require('http')
  const swaggerUi = require('swagger-ui-express')
  const swaggerFile = require('./swagger_output.json')
  
  http.createServer(app).listen(3000)
  console.log("Listening at:// port:%s (HTTP)", 3000)*/
  
  app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))
  
  require('./endpoints')(app)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function request_info_log(req,res,next)
{
  console.log(new Date().toISOString())
  next();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var proxy_queue=[];
function get_queue(req,res)
{
  res.json(proxy_queue);
}

const proxy_timeout=10;
const proxy_tick=1000;
function request_to_proxy(req,res)
{
  var sid=req.params['sid'];
  var did=req.params['did'];
  var jid=uuid.v1();
  console.log('Job ID:'+jid+' , sid:'+sid+' , did:'+did);
  ////////////////////////////////////////////////////
  var request={};
  var timeout=proxy_timeout;
  if(req.query!=undefined && req.query.timeout!=undefined)
    timeout=req.query.timeout;
  request.sid=sid;
  request.did=did;
  request.jid=jid;
  request.query=req.query;
  request.timeout=timeout;
  ////////////////////////////////////////////////////
  if(req.method=="GET")
  {
    proxy_queue.push(request);
    setTimeout(hold_and_forward_request_reply,proxy_tick,jid,req,res);
  }
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
      request.body=body;
      proxy_queue.push(request);    
      setTimeout(hold_and_forward_request_reply,proxy_tick,jid,req,res);
    });
  }
  ////////////////////////////////////////////////////
}

function hold_and_forward_request_reply(jid,req,res)
{
  var job=null;
  proxy_queue.forEach(r => {
    if(r.jid==jid)
    {
      if(r.reply!=undefined)
      {
        console.log("Job ID:"+jid+" reply");
        res.json(r.reply);
        job=jid;
      }
      else if(r.timeout>0)
        r.timeout--;
      else
      {
        console.log("Job ID:"+jid+" timeout");
        res.json({msg:"timeout"})
        job=jid;
      }
    }
  });

  proxy_queue=proxy_queue.filter((v,i,a)=>{
    return v.jid!=job;
  });
  setTimeout(hold_and_forward_request_reply,proxy_tick,jid,req,res);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function proxy_reply(req,res)
{
//  var sid=req.params['sid'];
  var jid=req.params['jid'];

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
    var nojob=true;
    proxy_queue.forEach(r => {
      if( /*r.sid==sid &&*/ r.jid==jid)
      {
        nojob=false;
        r.timeout++; // make sure it can reply 
        r.reply=body;
        res.json({result:0,msg:"done"});
      }
    });
    if(nojob)
      res.json({result:1,msg:"No job"});
  });

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

  res.json ({"val":val,unit:"dBm","timestamp":now});
}

function get_tan_data(req,res)
{
  let now=new Date();
  let hours=now.getHours();
  let minutes=now.getMinutes();
  let seconds=now.getSeconds();
  let val=30*Math.tan((seconds/61)*(Math.PI/4))

  res.json ({"val":val,unit:"kW h","timestamp":now});
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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var snb_ServerIP="192.168.108.182";
var snb_ServerPort="80";
var snb_ServerUserName="admin"
var snb_ServerPassword="admin"
var snb_ServerID="07444610-faa8-4dfa-91fd-96fbadefdd6c";
var signKey=null;
var hash=null;
const util = require('util');
var url=util.format("http://%s:%s/user/validate.dhtml?acceptType=json&username=%s&password=%s&serverId=%s",
                        snb_ServerIP,snb_ServerPort,
                        snb_ServerUserName,snb_ServerPassword
                        ,snb_ServerID);
console.log(url);
request(url,{json:true},(err,res,body)=>{
  console.log(body);
  if(body.signKey!=undefined)
  {
    signKey=body.signKey

    const crypto = require('crypto');
    var str=signKey; //"34d1d900874e4bedb95f800ff957f7ecf6e0308b0a1a47d09a362402e7c65d586755256945264c2787560486a024c503" //signkey
    str+=snb_ServerID; //serverid
    str+=""; //token
    
    hash = crypto.createHash('md5').update(str).digest('hex');
    
    console.log("md5:"+hash);
    //http://192.168.108.182/user/validate.dhtml?acceptType=json&username=admin&password=admin&serverId=07444610-faa8-4dfa-91fd-96fbadefdd6c

    var url_query=util.format("http://%s:%s/%s?&api=true&token=&sign=%s&serverId=%s",
                                snb_ServerIP,snb_ServerPort,
                                "queryAllDevice.dhtml",
                                hash,
                                snb_ServerID);

    request(url_query,{json:true},(err2,res2,body2)=>{
      console.log(url_query)
      console.log(body2);
    });

    var url_getall=util.format("http://%s:%s/%s?&api=true&token=&sign=%s&serverId=%s",
                                snb_ServerIP,snb_ServerPort,
                                "device/get_all_device_by_simple.dhtml",
                                hash,
                                snb_ServerID);
    if(false)request(url_getall,{json:true},(err2,res2,body3)=>{
      console.log(url_getall)
      console.log(body3);

      explode(body3,'');

      function explode(objs,parent)
      {
        if(objs && typeof objs ==="object"){
          for(var obj in objs)
          {
            if(typeof objs[obj]!=="object")
              console.log(parent+'/'+obj+":"+objs[obj]);
            else
              explode(objs[obj],parent+'/'+obj)
          }
        }
      }
    });
/*
    var url_getall2=util.format("http://%s:%s/%s?&api=true&token=&sign=%s&serverId=%s&id=%s",
                                  snb_ServerIP,snb_ServerPort,
                                  "device.dhtml",
                                  hash,
                                  snb_ServerID,
                                  "2F0D207D0E0B3165");

    request(url_getall2,{json:true},(err2,res2,body2)=>{
      console.log(url_getall2)
      console.log(body2);

      var url_turnon=util.format("http://%s:%s/%s?&api=true&token=&sign=%s&serverId=%s&wayId=%s&actionType=%s",
      snb_ServerIP,snb_ServerPort,
      "device/change.dhtml",
      hash,
      snb_ServerID,
      "6894AB0DA4D2E0C7","OPEN"
      );
      request(url_turnon,{json:true},(err3,res3,body3)=>{
              console.log(url_turnon)
              console.log(body3);
            });
    });*/
  }
});

if(process.env.REMOTE_HOST!==undefined)
{

const axios = require('axios')
setInterval(() => {
  request(REMOTE_HOST+'/queue',{json:true},(e,resp,body)=>{
 //   body=JSON.parse(body);
    body.forEach(e => {
      if(e.sid!=undefined && e.sid=='demo') {
        var jid=e.jid;
        if(e.body==undefined)
        { //get
          var url_getall=util.format("http://%s:%s/%s?&api=true&token=&sign=%s&serverId=%s",
                                        snb_ServerIP,snb_ServerPort,
                                        "queryAllDevice.dhtml",//"device/get_all_device_by_simple.dhtml",
                                        hash,
                                        snb_ServerID);

          request(url_getall,{json:true},(err2,res2,data)=>{
            let devices=[];
            for(let d in data.devices)
            {
              if(d && data.devices[d].deviceWayList && data.devices[d].deviceWayList.length>0)
              {
                for(let i in data.devices[d].deviceWayList)
                {
                  if(data.devices[d].deviceWayList[i].functionType!="SCENE_BUTTON")
                  {
                    let dd=data.devices[d].deviceWayList[i];
                    let device={};
                    device.did=dd.id;
                    device.name=data.devices[d].name+'/'+dd.name;
                    device.type=dd.functionType;
                    device.unit=dd.unitSensorValue;
                    device.status=(dd.status=="ON");
                    if(device.name.startsWith('DIMMER'))
                      device.value=dd.brightness;
                    else
                      device.value=dd.sensorValue/dd.sensorValueRatio;
                    devices.push(device);
                  }
                }
              }
            }
            if(e.did)
            {
              devices=devices.filter((v,i,a)=>{
                return v.did==e.did;
              });
            }
            //post to server
            axios.post(REMOTE_HOST+'/job/'+jid,devices)
            .then(res=>{
              console.log('status:'+res.status);
            })
            .catch(err=>{
              console.log('err:'+err);
          });
          });
        }
        else
        { // post
          var url_get=util.format("http://%s:%s/%s?&api=true&token=&sign=%s&serverId=%s",
                                      snb_ServerIP,snb_ServerPort,
                                      "device/change.dhtml",
                                      hash,
                                      snb_ServerID);
          url_get+='&wayId='+e.body[0].did;//CB501E34CD8CBD23
          url_get+='&actionType='+(e.body[0].status?"OPEN":"CLOSE");
          if(e.body[0].value)
            url_get+='&brightness='+Math.max(Math.min(e.body[0].value,95),5);
          request(url_get,{json:true},(err2,res2,data2)=>{

            var url_getall=util.format("http://%s:%s/%s?&api=true&token=&sign=%s&serverId=%s",snb_ServerIP,snb_ServerPort, "queryAllDevice.dhtml",hash,snb_ServerID);

            request(url_getall,{json:true},(err3,res3,data)=>{
              let devices=[];
              for(let d in data.devices)
              {
                if(d && data.devices[d].deviceWayList && data.devices[d].deviceWayList.length>0)
                {
                  for(let i in data.devices[d].deviceWayList)
                  {
                    if(data.devices[d].deviceWayList[i].functionType!="SCENE_BUTTON")
                    {
                      let dd=data.devices[d].deviceWayList[i];
                      let device={};
                      device.did=dd.id;
                      device.name=data.devices[d].name+'/'+dd.name;
                      device.type=dd.functionType;
                      device.unit=dd.unitSensorValue;
                      device.status=(dd.status=="ON");
                      if(device.name.startsWith('DIMMER'))
                        device.value=dd.brightness;
                      else
                        device.value=dd.sensorValue/dd.sensorValueRatio;
                      devices.push(device);
                    }
                  }
                }
              }
              if(e.body[0].did)
              {
                devices=devices.filter((v,i,a)=>{
                  return v.did==e.body[0].did;
                });
              }
              //post to server
              axios.post(REMOTE_HOST+'/job/'+jid,devices)
              .then(res=>{console.log('status:'+res.status);})
              .catch(err=>{console.log('err:'+err); });
            });


          });


        }
      }  
    });
  });
}, 500);

}