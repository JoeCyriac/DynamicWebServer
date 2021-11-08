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

//declare global arrays for state abbreviations and names
let stateAbrev = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
                'IL', 'IN', 'IA', 'KS', 'KT', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
                'NB', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                'SD', 'TN', 'TX', 'UT', 'VT', 'VI', 'WA', 'WV', 'WI', 'WY', 'DC'];
let stateFull = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
                'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
                'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
                'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
                'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
                'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
                'Wisconsin', 'Wyoming', 'Washington D.C.'];


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

// Helper function to capitalize the first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

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

                
                let prevYear = parseInt(year)-1;
                let nextYear = parseInt(year)+1;
                
                if (year == 1960){
                    prevYear = 2018;
                } 
                if (year == 2018){
                    nextYear = 1960;
                }

                response = response.replace("{{{PREV}}}", "/year/" + prevYear);
                response = response.replace("{{{NEXT}}}", "/year/" + nextYear);

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

        

            
            let i;
            stateName = '';
            stateIndex = '';
            for (i=0; i<51; i++){
                if (stateAbrev[i].toUpperCase()==state){
                    stateName = stateFull[i];
                    stateIndex = i;
                    break;
                }
            }

            if (stateName==''){
                res.status(404).send('Error: no data for state ' + state.toUpperCase());
            }

            else {
                let response = template.replace("{{{TOPSTATE}}}", stateName);
                response = response.replace("{{{STATE}}}", state);

                let prevStateIndex = stateIndex-1;
                let nextStateIndex = stateIndex+1;
                if (stateIndex == 0){
                    prevStateIndex = stateAbrev.length-1;
                } 
                if (stateIndex == stateAbrev.length-1){
                    nextStateIndex = 0;
                } 
                response = response.replace("{{{PREV}}}", "/state/" + stateAbrev[prevStateIndex]);
                response = response.replace("{{{NEXT}}}", "/state/" + stateAbrev[nextStateIndex]);

                db.all('SELECT year, coal, natural_gas, nuclear, petroleum, renewable FROM Consumption WHERE state_abbreviation = ? ORDER BY year ASC', [state], (err, rows) => {
                    if (err) {
                        res.status(404).send('Error: data not found');
                    }
                    else {    
                    
                        let i;
                        let year_array = new Array();
                        let coal_array = new Array();
                        let coal_datastring = '';
                        let natural_gas_array = new Array();
                        let ng_datastring = '';
                        let nuclear_array = new Array();
                        let nuclear_datastring = '';
                        let petroleum_array = new Array();
                        let petroleum_datastring = '';
                        let renewable_array = new Array();
                        let renewable_datastring = '';
                        let list_items = '';
                        response = response.replace("{{{STATEIMG}}}", "/images/" + state.toUpperCase() + ".png")
                        console.log("/images/" + state.toUpperCase() + ".png");

                        for(i = 0; i < rows.length; i++) {
                            year_array[i] = rows[i].year;
                            coal_array[i] = rows[i].coal;
                            natural_gas_array[i] = rows[i].natural_gas;
                            nuclear_array[i] = rows[i].nuclear;
                            petroleum_array[i] = rows[i].petroleum;
                            renewable_array[i] = rows[i].renewable;
                            var total = parseInt(rows[i].coal) + parseInt(rows[i].natural_gas) + parseInt(rows[i].nuclear) + parseInt(rows[i].petroleum) + parseInt(rows[i].renewable);
                            list_items += '<tr><td>' + rows[i].year + '</td>' + '<td>' + rows[i].coal + '</td>'+ '<td>' + rows[i].natural_gas + '</td>'+ '<td>' + rows[i].nuclear + '</td>'+ '<td>' + rows[i].petroleum + '</td>'+ '<td>' + rows[i].renewable + '</td>' + '<td>' + total + '</td></tr>';
                        }

                        for(i = 0; i < rows.length; i++) {
                            if(i == rows.length - 1)
                            {
                                coal_datastring = coal_datastring + "{y: " + coal_array[i] + ", label: " + year_array[i] + "}";
                                ng_datastring = ng_datastring + "{y: " + natural_gas_array[i] + ", label: " + year_array[i] + "}";
                                nuclear_datastring = nuclear_datastring + "{y: " + nuclear_array[i] + ", label: " + year_array[i] + "},";
                                petroleum_datastring = petroleum_datastring + "{y: " + petroleum_array[i] + ", label: " + year_array[i] + "}";
                                renewable_datastring = renewable_datastring + "{y: " + renewable_array[i] + ", label: " + year_array[i] + "}";
                            }
                            else
                            {
                                coal_datastring = coal_datastring + "{y: " + coal_array[i] + ", label: " + year_array[i] + "},";
                                ng_datastring = ng_datastring + "{y: " + natural_gas_array[i] + ", label: " + year_array[i] + "},";
                                nuclear_datastring = nuclear_datastring + "{y: " + nuclear_array[i] + ", label: " + year_array[i] + "},";
                                petroleum_datastring = petroleum_datastring + "{y: " + petroleum_array[i] + ", label: " + year_array[i] + "},";
                                renewable_datastring = renewable_datastring + "{y: " + renewable_array[i] + ", label: " + year_array[i] + "},";
                            }
                        }

                        response = response.replace("{{{COAL_DATA}}}", coal_datastring);
                        response = response.replace("{{{NATURAL_GAS_DATA}}}", ng_datastring);
                        response = response.replace("{{{NUCLEAR_DATA}}}", nuclear_datastring);
                        response = response.replace("{{{PETROLEUM_DATA}}}", petroleum_datastring);
                        response = response.replace("{{{RENEWABLE_DATA}}}", renewable_datastring);
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

            let energyList = ['coal', 'natural_gas', 'nuclear', 'petroleum', 'renewable'];
            let sourceIndex = '';
            let i;
            for (i = 0; i < energyList.length; i++) {
                if (source == energyList[i]){
                    sourceIndex = i;
                    break;
                }
            }

            if (source != 'coal' && source != 'natural_gas' && source != 'renewable' && source != 'nuclear' && source != 'petroleum'){
                console.log(source);
                console.log('coal');
                console.log('natural_gas');
                console.log('renewable');
                console.log('nuclear');
                console.log('petroleum');
                res.status(404).send('Error: no data for source ' + source);
            }

            else {
                let response = template.replace("{{{TOPENERGY}}}", capitalizeFirstLetter(source));
                response = response.replace("{{{ENERGYIMG}}}", "/images/" + source + ".jpg")

                let prevSourceIndex = sourceIndex-1;
                let nextSourceIndex = sourceIndex+1;

                if (sourceIndex == 0){
                    prevSourceIndex = energyList.length-1;
                } 
                if (sourceIndex == energyList.length-1){
                    nextSourceIndex = 0;
                }

                response = response.replace("{{{PREV}}}", "/energy/" + energyList[prevSourceIndex]);
                response = response.replace("{{{NEXT}}}", "/energy/" + energyList[nextSourceIndex]);

                db.all('SELECT year, state_abbreviation, ' + source + ' FROM Consumption ORDER BY year ASC', (err, rows) => {
                    if (err) {
                        res.status(404).send('Error: data not found');
                    }
                    else {
                        let i;
                        let list_items1 = '';
                        let list_items2 = '';
                        let x = 0;
                        let year_array = new Array();
                        let coal_array = new Array();
                        let coal_datastring = '';
                        let natural_gas_array = new Array();
                        let ng_datastring = '';
                        let nuclear_array = new Array();
                        let nuclear_datastring = '';
                        let petroleum_array = new Array();
                        let petroleum_datastring = '';
                        let renewable_array = new Array();
                        let renewable_datastring = '';

                        for(i = 0; i < 51; i++) {
                            year_array[i] = rows[i].year;
                            coal_array[i] = rows[i].coal;
                            natural_gas_array[i] = rows[i].natural_gas;
                            nuclear_array[i] = rows[i].nuclear;
                            petroleum_array[i] = rows[i].petroleum;
                            renewable_array[i] = rows[i].renewable;
                            list_items1 += '<th>' + rows[i].state_abbreviation + '</th>';
                        }

                        for(i = 0; i < rows.length; i++) {
                            if(i == rows.length - 1)
                            {
                                coal_datastring = coal_datastring + "{y: " + coal_array[i] + ", label: " + year_array[i] + "}";
                                ng_datastring = ng_datastring + "{y: " + natural_gas_array[i] + ", label: " + year_array[i] + "}";
                                nuclear_datastring = nuclear_datastring + "{y: " + nuclear_array[i] + ", label: " + year_array[i] + "},";
                                petroleum_datastring = petroleum_datastring + "{y: " + petroleum_array[i] + ", label: " + year_array[i] + "}";
                                renewable_datastring = renewable_datastring + "{y: " + renewable_array[i] + ", label: " + year_array[i] + "}";
                            }
                            else
                            {
                                coal_datastring = coal_datastring + "{y: " + coal_array[i] + ", label: " + year_array[i] + "},";
                                ng_datastring = ng_datastring + "{y: " + natural_gas_array[i] + ", label: " + year_array[i] + "},";
                                nuclear_datastring = nuclear_datastring + "{y: " + nuclear_array[i] + ", label: " + year_array[i] + "},";
                                petroleum_datastring = petroleum_datastring + "{y: " + petroleum_array[i] + ", label: " + year_array[i] + "},";
                                renewable_datastring = renewable_datastring + "{y: " + renewable_array[i] + ", label: " + year_array[i] + "},";
                            }
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

                        response = response.replace("{{{TABLEH}}}", list_items1);
                        response = response.replace("{{{TABLEC}}}", list_items2);
                        response = response.replace("{{{COAL_DATA}}}", coal_datastring);
                        response = response.replace("{{{NATURAL_GAS_DATA}}}", ng_datastring);
                        response = response.replace("{{{NUCLEAR_DATA}}}", nuclear_datastring);
                        response = response.replace("{{{PETROLEUM_DATA}}}", petroleum_datastring);
                        response = response.replace("{{{RENEWABLE_DATA}}}", renewable_datastring);
                    

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
