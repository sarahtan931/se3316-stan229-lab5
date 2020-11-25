const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();
const auth = require('../auth');
const {check , validationResult}  = require('express-validator');
const fs = require('fs');
var data=fs.readFileSync('Lab3-timetable-data.json', 'utf8');
var newdata=JSON.parse(data);

const Timetable = mongoose.model('Timetables');
const Users = mongoose.model('Users');
const Review = mongoose.model('Review');

//show all the users schedules
router.get('/showschedule/:owner', auth.required ,(req, res) =>{
    let newarr = []
    owner = req.params.owner;
    Timetable.find(({"owner": owner}), function (err, review) {
        if (err || !review ){
            res.status(404).send(`not found`);
        }
        else {
              let arr = review.map(function(e) {
                 newarr.push({
                    "owner": e.owner,
                    "name": e.name,
                    "description": e.description,
                    "date": e.date,
                  })
              })
              const sorted = newarr.sort((a, b) => b.date - a.date)
              res.send(sorted);
            }    
    })           
})


//GET current route (required, only authenticated users have access)
router.get('/current', auth.required, (req, res, next) => {
    const { payload: { id } } = req;
  
    return Users.findById(id)
      .then((user) => {
        if(!user) {
          return res.sendStatus(400);
        }
  
        return res.json({ user: user.toAuthJSON() });
      });
  });

  //make a review
router.post('/makereview', auth.required, (req, res)=>{
    let subject = req.body.subject;
    let catalog_nbr = req.body.catalog_nbr;
    var err = validationResult(req);
    if (!err.isEmpty()) {
        console.log(err.mapped())
        res.status(404).send(`Not valid input`);
    } else {
        if (newdata.find(p => p.subject == subject && p.catalog_nbr == catalog_nbr)){
        const review = new Review({
            "reviewID": req.body.reviewID,
            "name": req.body.name,
            "subject": req.body.subject,
            "catalog_nbr": req.body.catalog_nbr,
            "hidden": req.body.hidden,
            "review": req.body.review,
            "rating": req.body.rating,
            "date": Date.now()
        })
        review.save()
        .then((result) => res.send(result))
        .catch((err) => console.log(err))
        }else{
            res.status(404).send("Please enter a valid timetable input")
        }
    }
}) 

//creates new schedule
router.post('/makeschedule', [
    check('name').trim().matches(/^([0-9A-Za-z\u00AA-\uFFDC]*)$/).isLength({ min: 1, max:20 }).escape(),
    check('owner').trim().matches(/^([0-9A-Za-z\u00AA-\uFFDC]*)$/).isLength({ min: 1, max:20 }).escape()
    ], (req, res)=>{
    var err = validationResult(req);
    if (!err.isEmpty()) {
        console.log(err.mapped())
        res.status(404).send(`Not valid input`);
    } else {
        let courseNum = req.body.courseNum;
        let courseId = req.body.courseId;
        let name = req.body.name;
        let owner = req.body.owner;
        let description = req.body.description;
        let hidden = req.body.hidden;

    if (typeof hidden == "undefined"){
        hidden = true;
    }
    Timetable.countDocuments({"owner": owner}, function(err, count){
        console.log( "Number of course lists from ",owner, " ", count);
        if (count > 20){
            res.status(404).send(`User has 20 timetables`);
        }
    })
    Timetable.findOne(({"name": name, "owner": owner}), function (err, timetable) {
        if (err || timetable || typeof courseNum == "undefined" || typeof courseId == "undefined"){ 
            res.status(404).send(`Already Exists`);
        }
        else{
        let numArr = courseNum.split(" ");
        let idArr = courseId.split(" ");
        let newarr = [];
        for (let i = 0; i < numArr.length; i++){ 
            //only allowing the user to enter a valid timetable        
            if(numArr[i] != "" && idArr[i] !="" && newdata.find(p => p.subject === idArr[i] && p.catalog_nbr === numArr[i])){
                const data = newdata.filter(p => p.subject === idArr[i] && p.catalog_nbr === numArr[i])
                data.map(function(e){
                    newarr.push({
                        "classname": e.className,
                        "class_section": e.course_info[0].class_section,
                        "ssr_component":e.course_info[0].ssr_component,
                        "course_info": e.course_info[0],
                        "catalog_nbr": e.catalog_nbr,
                        "subject": e.subject
                    });
                    })
            }
            else{
                res.status(404).send(`Please enter a valid timetable input`);
                return;
            }
        }
        const schedule = new Timetable({ 
            "owner": owner,
            "name": name,
            "description": description,
            "date": new Date(),
            "hidden": hidden,
            "timetable": newarr
         })
        schedule.save()
        .then((result) => res.send(result))
        .catch((err) => console.log(err))
        }
      }) 
    }  
})

//update existing schedule
router.put('/updateschedule', [
    check('name').trim().matches(/^([0-9A-Za-z\u00AA-\uFFDC]*)$/).isLength({ min: 1, max:20 }).escape(),
    check('owner').trim().matches(/^([0-9A-Za-z\u00AA-\uFFDC]*)$/).isLength({ min: 1, max:20 }).escape()
    ], (req, res)=>{
    var err = validationResult(req);
    let name = req.body.name;
    let courseNum = req.body.courseNum;
    let courseId = req.body.courseId;
    let description = req.body.description;
    let hidden = req.body.hidden;

    let numArr = courseNum.split(" ");
    let idArr = courseId.split(" ");
    let arr = []

    Timetable.findOne(({"name": name}), function (err, timetable) {
        if (err || !timetable || timetable.length <= 0){ 
            res.status(404).send(`not found`);
        }
         else{ 
            for (let i = 0; i < numArr.length; i++){ 
                    //only allowing the user to enter a valid timetable   
                if(numArr[i] != "" && idArr[i] !="" && newdata.find(p => p.subject === idArr[i] && p.catalog_nbr === numArr[i])){
                   // arr.push({courseName: numArr[i], courseID: idArr[i]});
                   const data = newdata.filter(p => p.subject === idArr[i] && p.catalog_nbr === numArr[i])
                   data.map(function(e){
                       arr.push({
                           "classname": e.className,
                           "class_section": e.course_info[0].class_section,
                           "ssr_component":e.course_info[0].ssr_component,
                           "course_info": e.course_info[0],
                           "catalog_nbr": e.catalog_nbr,
                           "subject": e.subject
                       });
                       })
                }
            }   
           
            timetable.timetable = arr;
            timetable.description = description;
            timetable.hidden = hidden;

            timetable.save() 
            res.send(timetable) 
            }  
        })
}) 

router.delete('/schedule/del/:owner/:name', (req, res) =>{
    const name = req.params.name;
    const owner = req.params.owner;
    Timetable.findOne(({"owner":owner,"name": name}), function (err, timetable) {
        if (err || !timetable || timetable.length <= 0){ 
            res.status(404).send(`not found`);
        }
        else{
        timetable.deleteOne({"name": name})
        .then((result) => res.send(result))
        .catch((err) => console.log(err))
      
        }
      })    
})

module.exports = router ;