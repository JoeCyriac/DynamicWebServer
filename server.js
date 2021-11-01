// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

let app = express();
let port = 8000;

// Open usenergy.sqlite3 database
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

// Serve static files from 'public' directory
app.use(express.static(public_dir));


// GET request handler for home page '/' (redirect to /year/2018)
app.get('/', (req, res) => {
    res.redirect('/year/2018');
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), 'utf-8', (err, template) => {
        
        if (err) {
            res.status(404).send('Error: file not found');
        }

        else {
            // modify `template` and send response
            // this will require a query to the SQL database
            let year = req.params.selected_year;
            if (year < 1960 || year > 2018) {
                res.status(404).send('Error: no data for year ' + year);
            }

            let response = template.replace("{{{TOPYEAR}}}", year);

            db.all('SELECT state_abbreviation, coal, natural_gas, nuclear, petroleum, renewable FROM Consumption WHERE year = ?', [req.params.selected_year], (err, rows) => {
                console.log(rows);
                let i;
                let list_items = '';
                for(i = 0; i < rows.length; i++) {
                    var total = parseInt(rows[i].coal) + parseInt(rows[i].natural_gas) + parseInt(rows[i].nuclear) + parseInt(rows[i].petroleum) + parseInt(rows[i].renewable);
                    list_items += '<tr><td>' + rows[i].state_abbreviation + '</td>' + '<td>' + rows[i].coal + '</td>'+ '<td>' + rows[i].natural_gas + '</td>'+ '<td>' + rows[i].nuclear + '</td>'+ '<td>' + rows[i].petroleum + '</td>'+ '<td>' + rows[i].renewable + '</td>' + '<td>' + total + '</td></tr>';
                }
                console.log(list_items);
                response = response.replace("{{{TABLE}}}", list_items);

                res.status(200).type('html').send(response); // <-- you may need to change this
            });
        }
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state);
    fs.readFile(path.join(template_dir, 'state.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);
    fs.readFile(path.join(template_dir, 'energy.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
