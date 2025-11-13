const express = require('express')
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;
require('dotenv').config()
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6t2ckxo.mongodb.net/?appName=Cluster0`;

app.get('/', (req, res) => {
  res.send('server is  running')
})

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();

    const db = client.db('healthDBtraker')
    const healthCollection = db.collection('health')
    const habitCollection = db.collection('habit')
    const streakCollection = db.collection("streaks");
// -------------------- Mark Complete --------------------
app.put("/habit/:id/complete", async (req, res) => {
  const { id } = req.params;

  const habit = await habitCollection.findOne({ _id: new ObjectId(id) });
  if (!habit) return res.status(404).send({ error: "Habit not found" });

  // ✅ Bangladesh timezone fix (UTC+6)
  const now = new Date();
  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const today = bdTime.toISOString().split("T")[0]; // "2025-11-10"

  let streakDoc = await streakCollection.findOne({ habitId: id });
  const currentHistory = streakDoc?.completionHistory || [];

  // ✅ একদিনে একবারই complete করা যাবে
  if (currentHistory.some(d => d === today)) {
    return res.status(400).send({ error: "Already completed today" });
  }

  // ✅ আজকের দিন add করো
  const updatedHistory = [...currentHistory, today].sort((a, b) => new Date(b) - new Date(a));

  // ✅ streak গণনা
  let streak = 1;
  for (let i = 0; i < updatedHistory.length - 1; i++) {
    const currentDate = new Date(updatedHistory[i]);
    const nextDate = new Date(updatedHistory[i + 1]);
    const diffDays = (currentDate - nextDate) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) streak++;
    else break; // break হলেই থামবে
  }

  // ✅ DB তে save করো
  await streakCollection.updateOne(
    { habitId: id },
    {
      $set: {
        habitId: id,
        streak,
        completionHistory: updatedHistory,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  res.send({ success: true, streak, completionHistory: updatedHistory });
});


// -------------------- Get Habit --------------------
app.get("/habit/:id", async (req, res) => {
  const { id } = req.params;
  const habit = await habitCollection.findOne({ _id: new ObjectId(id) });
  if (!habit) return res.status(404).send({ error: "Habit not found" });

  const streakDoc = await streakCollection.findOne({ habitId: id });

  // ✅ Time check — যদি আজকে complete না করা হয়, streak reset হয়ে যাবে
  let streak = streakDoc ? streakDoc.streak : 0;
  let completionHistory = streakDoc ? streakDoc.completionHistory : [];

  if (completionHistory.length > 0) {
    const now = new Date();
    const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const today = bdTime.toISOString().split("T")[0];
    const lastDate = completionHistory[0];

    const diffDays =
      (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24);

    // ✅ যদি গতকাল complete করা না হয় → streak reset
    if (diffDays > 1) {
      streak = 0;
    }
  }

  habit.streak = streak;
  habit.completionHistory = completionHistory;

  res.send(habit);
});


    // final api dont touvh here
    app.get('/habit', async (req, res) => {
      const result = await habitCollection.find().toArray()
      res.send(result)
    })

    app.get('/habit/:id', async (req, res) => {
      const { id } = req.params
      const query = { _id: new ObjectId(id) }
      const result = await habitCollection.findOne(query)
      res.send(result)
    })
    app.put('/habit/:id', async (req, res) => {
      const { id } = req.params
      const data = req.body

      const query = { _id: new ObjectId(id) }
      const filter = query
      const update = {
        $set: data
      }
      const result = await habitCollection.updateOne(filter, update)

      res.send(result)
    })
    app.delete('/habit/:id', async (req, res) => {
      const { id } = req.params
      const query = { _id: new ObjectId(id) }
      const result = await habitCollection.deleteOne(query)
      res.send(result)
    })
    app.post('/habit', async (req, res) => {
      const data = req.body

      const result = await habitCollection.insertOne(data)
      res.send(result)
    })
  
    app.get('/search', async (req, res) => {
      const search = req.query.search
      const result = await habitCollection.find({ title:{$regex:search, $options: 'i'}}).toArray()
      res.send(result)
    })

    // my habit api
    app.get('/my-habit', async (req, res) => {
      const email = req.query.email

      const result = await habitCollection.find({

        creatorEmail: email
      }).toArray()
      res.send(result)
    })

    // latest habit
    app.get('/latest-habit',async(req,res)=>{
      const result=await habitCollection.find().sort({createdAt: -1}).limit(6).toArray()
      res.send(result)
    })

    // health related api
   

    app.get('/latest-health', async (req, res) => {
      const result = await healthCollection.find().sort({ createdAt: 'desc' }).limit(6).toArray()
      res.send(result)
    })
    app.get('/health/:id', async (req, res) => {
      const { id } = req.params
      const query = { _id: id }
      const result = await healthCollection.findOne(query)
      res.send(result)

    })




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Server is running Now ${port}`)
})