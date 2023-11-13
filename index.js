const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000;


// middleware

app.use(cors());
app.use(express.json());


app.get('/',(res,req)=>{
    req.send('bistro boss server is runig')
})

app.listen(port, ()=>{
    console.log(`bistro bos server runig and stiing on port ${port}`)
})





