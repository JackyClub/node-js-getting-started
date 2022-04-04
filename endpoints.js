
module.exports = function (app) {
	
    app.get('/iot/control',control)
    app.get('/iot/control/:did',control)
    app.post('/iot/control',control

    )
}

var controlArray=[
    {did:"room1",status:true,value:70},
    {did:"room2",status:true,value:60},
    {did:"room3",status:true,value:50}
  ];

function control(req,res)
{
        /* #swagger.parameters['obj'] = { 
            in: 'body', 
            '@schema': { 
                "required": ["name"], 
                "properties": { 
                    "name": { 
                        "type": "string", 
                        "minLength": 2, 
                        "maxLength": 250, 
                        "example": "Some example..." 
                    } 
                } 
            }
        }
            #swagger.responses[200] = {
                description: 'Some description...',
                schema: {
                    name: 'Jhon Doe',
                    age: 29,
                    about: ''
                }
            }
    */
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
