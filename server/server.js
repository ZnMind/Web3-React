import * as path from 'path';
import * as express from 'express';
//import apiRouter from './routes';

const app = express();

const __dirname = path.dirname('A:\Harmony\dkp')

app.use(express.static(path.join(__dirname, 'build')));
app.use(express.json());
//app.use('/api', apiRouter);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'))
});

app.listen(3000, () => {
    console.log("server is running on port 3000")
})