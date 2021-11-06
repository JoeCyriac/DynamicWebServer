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
            if (year < 1960 || year > 2018 || parseInt(year)*0 != 0) {
                res.status(404).send('Error: no data for year ' + year);
            }

            else {

                let response = template.replace("{{{TOPYEAR}}}", year);
                response = response.replace("{{{YEAR}}}", year);

                db.all('SELECT state_abbreviation, coal, natural_gas, nuclear, petroleum, renewable FROM Consumption WHERE year = ?', [req.params.selected_year], (err, rows) => {
                    if (err) {
                        res.status(404).send('Error: data not found');
                    }
                    else {
                        let i;
                        let list_items = '';
                        let totalcoal = 0;
                        let totalnatgas = 0;
                        let totalnuclear = 0;
                        let totalpetrol = 0;
                        let totalrenewable = 0;
                        let finaltotal = 0;
                        for(i = 0; i < rows.length; i++) {
                            var total = parseInt(rows[i].coal) + parseInt(rows[i].natural_gas) + parseInt(rows[i].nuclear) + parseInt(rows[i].petroleum) + parseInt(rows[i].renewable);
                            totalcoal += parseInt(rows[i].coal);
                            totalnatgas += parseInt(rows[i].natural_gas);
                            totalnuclear += parseInt(rows[i].nuclear);
                            totalpetrol += parseInt(rows[i].petroleum);
                            totalrenewable += parseInt(rows[i].renewable);
                            finaltotal += total
                            list_items += '<tr><td>' + rows[i].state_abbreviation + '</td>' + '<td>' + rows[i].coal + '</td>'+ '<td>' + rows[i].natural_gas + '</td>'+ '<td>' + rows[i].nuclear + '</td>'+ '<td>' + rows[i].petroleum + '</td>'+ '<td>' + rows[i].renewable + '</td>' + '<td>' + total + '</td></tr>';
                        }
                        response = response.replace("{{{COAL_COUNT}}}", (totalcoal/finaltotal)*100);
                        response = response.replace("{{{NATURAL_GAS_COUNT}}}", (totalnatgas/finaltotal)*100);
                        response = response.replace("{{{NUCLEAR_COUNT}}}", (totalnuclear/finaltotal)*100);
                        response = response.replace("{{{PETROLEUM_COUNT}}}", (totalpetrol/finaltotal)*100);
                        response = response.replace("{{{RENEWABLE_COUNT}}}", (totalrenewable/finaltotal)*100);
                        response = response.replace("{{{TABLE}}}", list_items);

                        res.status(200).type('html').send(response); // <-- you may need to change this
                    }
                });
            }
        }
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state);
    fs.readFile(path.join(template_dir, 'state.html'), 'utf-8', (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if (err) {
            res.status(404).send('Error: file not found');
        }

        else {
            // modify `template` and send response
            // this will require a query to the SQL database
            let state = req.params.selected_state.toUpperCase();

            //let imgName = "/images/" + state.toUpperCase() + ".png";
            //let stateImg = document.getElementById("stateImage");
            //stateImg.src = imgName;

            let stateAbrev = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
                'IL', 'IN', 'IA', 'KS', 'KT', 'LA', 'MA', 'MD', 'MS', 'MI', 'MN', 'MS', 'MO', 'MT',
                'NB', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                'SD', 'TN', 'TX', 'UT', 'VT', 'VI', 'WA', 'WV', 'WI', 'WY', 'DC'];
            let stateFull = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
                'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
                'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
                'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
                'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
                'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
                'Wisconsin', 'Wyoming', 'Washington D.C.'];
            let i;
            stateName = '';
            for (i=0; i<51; i++){
                if (stateAbrev[i].toUpperCase()==state){
                    stateName = stateFull[i];
                    break;
                }
            }

            if (stateName==''){
                res.status(404).send('Error: no data for state ' + state.toUpperCase());
            }

            else {
                let response = template.replace("{{{TOPSTATE}}}", stateName);

                db.all('SELECT year, coal, natural_gas, nuclear, petroleum, renewable FROM Consumption WHERE state_abbreviation = ? ORDER BY year ASC', [state], (err, rows) => {
                    if (err) {
                        res.status(404).send('Error: data not found');
                    }
                    else {    
                        console.log(rows);
                        let i;
                        let list_items = '';
                        for(i = 0; i < rows.length; i++) {
                            var total = parseInt(rows[i].coal) + parseInt(rows[i].natural_gas) + parseInt(rows[i].nuclear) + parseInt(rows[i].petroleum) + parseInt(rows[i].renewable);
                            list_items += '<tr><td>' + rows[i].year + '</td>' + '<td>' + rows[i].coal + '</td>'+ '<td>' + rows[i].natural_gas + '</td>'+ '<td>' + rows[i].nuclear + '</td>'+ '<td>' + rows[i].petroleum + '</td>'+ '<td>' + rows[i].renewable + '</td>' + '<td>' + total + '</td></tr>';
                        }
                        console.log(list_items);
                        response = response.replace("{{{TABLE}}}", list_items);

                        res.status(200).type('html').send(response); // <-- you may need to change this
                    }
                });
            }
        }

    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);
    fs.readFile(path.join(template_dir, 'energy.html'), 'utf-8', (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if (err) {
            res.status(404).send('Error: file not found');
        }

        else {
            // modify `template` and send response
            // this will require a query to the SQL database
            let source = req.params.selected_energy_source.toLowerCase();


            if (source.toUpperCase()!='COAL' && source.toUpperCase()!='NATURAL_GAS' &&
                source.toUpperCase()!='NUCLEAR' && source.toUpperCase()!='PETROLEUM' &&
                source.toUpperCase()!='RENEWABLE'){
                res.status(404).send('Error: no data for source ' + source);
            }

            else {

                let response = template.replace("{{{TOPENERGY}}}", source);
                
                let imgEName = "/images/" + source + ".png";
                let energyImg = document.getElementById("energyImage");
                energyImg.src = imgEName;

                db.all('SELECT year, state_abbreviation, ' + source + ' FROM Consumption ORDER BY year ASC', (err, rows) => {
                    if (err) {
                        res.status(404).send('Error: data not found');
                    }
                    else {
                        console.log(rows);
                        let i;
                        let list_items1 = '';
                        let list_items2 = '';
                        let x = 0;
                        for(i = 0; i < 51; i++) {
                            list_items1 += '<th>' + rows[i].state_abbreviation + '</th>';
                        }

                        for(i = 0; i < rows.length; i++) {
                            list_items2 += '<tr><td>' + rows[i].year + '</td>';
                            for(j = x; j < x + 51; j++) {
                                if (source == 'coal') {
                                    list_items2 += '<td>' + rows[j].coal + '</td>';
                                } 
                                
                                else if (source == 'natural_gas') {
                                    list_items2 += '<td>' + rows[j].natural_gas + '</td>';
                                } 
                                
                                else if (source == 'nuclear') {
                                    list_items2 += '<td>' + rows[j].nuclear + '</td>';
                                } 
                                
                                else if (source == 'petroleum') {
                                    list_items2 += '<td>' + rows[j].petroleum + '</td>';
                                } 
                                
                                else if (source == 'renewable') {
                                    list_items2 += '<td>' + rows[j].renewable + '</td>';
                                }
                            }
                            list_items2 += '</tr>'
                            i += 51;
                            x += 51;
                        }

                        console.log(source);
                        response = response.replace("{{{TABLEH}}}", list_items1);
                        response = response.replace("{{{TABLEC}}}", list_items2);

                        res.status(200).type('html').send(response); // <-- you may need to change this
                    }
                });
            }
        }
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
