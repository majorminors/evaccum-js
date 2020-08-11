
		////////////////////////
		/* participant set up */
		////////////////////////

		var participant_id = jsPsych.randomization.randomID(15);
		jsPsych.data.addProperties({
			participant_id: participant_id
		});

		/* use a random number generator to arbitrate between response mappings */
		if (((Math.floor(Math.random() * 100) + 1) % 2) === 0) {
			// the order of these variables are important because we index into them later, so:
			// if a random number generated between 1 and 100 is even then do this order
			/* keys */
			var resp_keys = ['a', 's'];
			var condition = ['as',1];
			/* cues */
			var cueheight = window.innerHeight*0.65; // set the height to be a percentage of the window height
			var cues = [
				{stimulus: "stimuli/1-3.svg"},
				{stimulus: "stimuli/2-4.svg"},
				{stimulus: "stimuli/3-1.svg"},
				{stimulus: "stimuli/4-2.svg"}
			];

		} else {
			// else (if the number is odd) do this order
			/* keys */
			var resp_keys = ['s', 'a'];
			var condition = ['sa',2];
			/* cues */
			var cues = [
				{stimulus: "stimuli/3-1.svg"},
				{stimulus: "stimuli/4-2.svg"},
				{stimulus: "stimuli/1-3.svg"},
				{stimulus: "stimuli/2-4.svg"}
			];
		}
		jsPsych.data.addProperties({
			condition: condition
		});
		var num_cues = 4;

		/* initialise timeline array */
        var timeline =[];

		///////////////////////
		/* coherence testing */
		///////////////////////

		/* first define the parameters */
		var num_coherence_blocks = 1;
		var num_trials_per_block = 160;
		// requires num_cues
		var coh_point_values =  [0.10, 0.20, 0.25, 0.30, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85];
		var num_point_tests = 16; 
		var num_trials_per_block = num_point_tests * coh_point_values.length; // check this is an integer, or it'll break
		
		// call stimulus_array_generator function and save output
		var coh_stim_array = coh_stimulus_array_generator(num_coherence_blocks, num_trials_per_block, num_cues, coh_point_values, num_point_tests);
		jsPsych.data.addProperties({
			coh_stim_array: coh_stim_array
		});

		/* generate coherence test procedure */
		var block;
		var trial;
		var count = 0;
		for (block = 0; block < coh_stim_array.length; block++) { // equivalent to number of blocks (coh_stim_array[0-n]) - should = num_blocks
			for (trial = 0; trial < coh_stim_array[0].length; trial++) { // equivalent to number of trials per block (coh_stim_array[x][0-n]) - should = num_trials_per_block
				count++; // use this to track how many trials have happened in total
				i_coh = coh_stim_array[block][trial]; // make this easier to call
				if (count === 1) {
					var coh_start_screen = {
						type: "html-keyboard-response",
						stimulus: "<p>This is the first test.</p><br>"+
							"<p>This will take about 5 minutes.</p><br>"+
							"<br><p>Press any key to begin.</p>"
					}
					timeline.push(coh_start_screen);
				}	

				if (count === 1 || (count-1) % 8 === 0) { // show this on the first trial, then every 8 - this assumes that a cue change happens after a number divisible by 8 otherwise your participant is going to have dots corresponding to a cue they haven't seen yet 
					var coh_cue = {
						type: 'image-keyboard-response',
						stimulus: cues[i_coh.cue_dir-1].stimulus, // -1 because cue_dir goes from 1-4 and javascript indexes from 0-3
						stimulus_height: cueheight,
						choices: resp_keys,
						data: {experiment_part: 'cohtest_cue'}
					}
					timeline.push(coh_cue);
				}

				var coh_fixation = { // do an rdk block with invisible dots (since the html doesn't line up with the rdk canvas, the fixation appears to jump around)
					type: 'rdk',
					background_color: "black",
					dot_color: "black", 
					aperture_type: 1,
					fixation_cross: true,
					fixation_cross_color: "white", 
					fixation_cross_thickness: 6,
					post_trial_gap: 0, 
					choices: jsPsych.NO_KEYS,
					correct_choice: "q",
					trial_duration: 300,
					data: {experiment_part: 'cohtest_fixation'}
				}
				timeline.push(coh_fixation);

				var coh_rdk = {
					type: 'rdk', 
					background_color: "black",
					dot_color: "white", 
					aperture_type: 1,
					fixation_cross: true,
					fixation_cross_color: "white", 
					fixation_cross_thickness: 6,
					post_trial_gap: 0, 
					number_of_dots: 100,
					response_ends_trial: false,
					coherence: i_coh.coherence_value, 
					move_distance: 2.5, // I've only approximated the MATLAB experiment here - that's 5 degrees per second (like .01 Hz/fps) this is in pixel lengths per second...
					dot_life: 7, // this is not the same as MATLAB - expressed in same units (frames of life), but MATLAB's 5 is visibly different to jsPsych's 5...
					choices: resp_keys,
					correct_choice: resp_keys[i_coh.match_arrow-1],
					coherent_direction: i_coh.dot_motion_deg_rdk, 
					trial_duration: 1500,
					data: {experiment_part: 'cohtest_rdk'}
				}
				var coh_feedback = { // you can use this for testing, otherwise comment out
					type: "html-keyboard-response",
					stimulus: function() {
						var last_rdk_accuracy = jsPsych.data.get().last(1).values()[0].correct; // dynamic var (runs throughout) asking for data.correct from last rdk block
						if (last_rdk_accuracy) { // if true (data.correct is boolean)
							return "<p>correct</p>";
						} else { // else if false
							return "<p>incorrect</p>"
						}
					},
					choices: jsPsych.NO_KEYS,
					trial_duration: 300,
					data: {experiment_part: 'cohtest_feedback'}
				}
				timeline.push(coh_rdk, coh_feedback);
			}
		}
	
		/* collecting data for analysis */
		var coh_analysis = {
			type: "html-keyboard-response",
			stimulus: "Now we analyse - press any key and please wait",
			data: {experiment_part: 'coherence_analysis'},
			on_finish: function () {
				var payload = {
					data_array: []
				};
				for (i = 0; i < coh_point_values.length; i++) {
					tmp_trls = jsPsych.data.get().filter({experiment_part: 'cohtest_rdk', coherence: coh_point_values[i]}).count();
					tmp_corr = jsPsych.data.get().filter({experiment_part: 'cohtest_rdk', correct: 1, coherence: coh_point_values[i]}).count();
					payload['data_array'].push([coh_point_values[i],tmp_corr,tmp_trls]);
				}
				console.log("results to post: ", payload['data_array']);

				// POST the data to the psignifit function
				axios({
					url: 'http://localhost:5000/coherence_thresholding',
					method: 'post',
					headers: {'Access-Control-Allow-Origin': 'http://localhost:5000/'},
					data: payload
				})
				.then(function (response) {
					console.log(response);
					coherence_values = response.data;
					console.log(coherence_values);
				})
				.catch(function (error) {
					console.log(error);
				});
			}
		}
		timeline.push(coh_analysis);
			
		// var coherence_values = [0.8, 0.3]; // we generate this from earlier psychophys -  [0] needs to be easy, [1] needs to be hard

		//////////////////
		/* rule testing */
		//////////////////

		/* first define parameters */
		var num_trials_per_block = 160;
		// requires num_cues
		var num_rule_blocks = 2; // one for each coherence level
		var rule_point_values =  [0,5,10,15,20,70,75,80,85,90];
		var num_point_tests = 16; 
		var num_trials_per_block = num_point_tests * rule_point_values.length; // check this is an integer, or it'll break

		// call stimulus_array_generator function
		var rule_stim_array = rule_stimulus_array_generator(num_rule_blocks, num_trials_per_block, num_cues, rule_point_values, num_point_tests);
		jsPsych.data.addProperties({
			rule_stim_array: rule_stim_array
		});

		/* generate rule test procedure */
		var block;
		var trial;
		var count = 0;
		var turn_off_block_indicator = 0;
		for (block = 0; block < rule_stim_array.length; block++) { // equivalent to number of blocks (rule_stim_array[0-n]) - should = num_blocks
			for (trial = 0; trial < rule_stim_array[0].length; trial++) { // equivalent to number of trials per block (rule_stim_array[x][0-n]) - should = num_trials_per_block
				count++; // use this to track how many trials have happened in total
				i_rule = rule_stim_array[block][trial]; // make this easier to call
				if (count === 1) {
					var rule_start_screen = {
						type: "html-keyboard-response",
						stimulus: "<p>This is the second test.</p><br>"+
							"<p>This will take about 10 minutes.</p><br>"+
							"<br><p>Press any key to begin.</p>"
					}
					timeline.push(rule_start_screen);
				}
				// indicate at start of each block what kind of dots to expect (easy or hard)	
				if (block === 0 && count === 1) {
					var block_indicator = {
						type: "html-keyboard-response",
						stimulus: "<p> first with easy dots </p>",
						choices: jsPsych.NO_KEYS,
						trial_duration: 500
					}
					timeline.push(block_indicator);
				} else if (block === 1 && turn_off_block_indicator === 0) {
					turn_off_block_indicator = 1;
					var block_indicator = {
						type: "html-keyboard-response",
						stimulus: "<p> now with hard dots </p>",
						choices: jsPsych.NO_KEYS,
						trial_duration: 500
					}
					timeline.push(block_indicator);
				}

				if (count === 1 || (count-1) % 8 === 0) { // show this on the first trial, then every 8 - this assumes that a cue change happens after a number divisible by 8 otherwise your participant is going to have dots corresponding to a cue they haven't seen yet 
					var rule_cue = {
						type: 'image-keyboard-response',
						stimulus: cues[i_rule.cue_dir-1].stimulus, // -1 because cue_dir goes from 1-4 and javascript indexes from 0-3
						stimulus_height: cueheight,
						choices: resp_keys,
						data: {experiment_part: 'ruletest_cue'}
					}
					timeline.push(rule_cue);
				}

				var rule_fixation = { // do an rdk block with invisible dots (since the html doesn't line up with the rdk canvas, the fixation appears to jump around)
					type: 'rdk',
					background_color: "black",
					dot_color: "black", 
					aperture_type: 1,
					fixation_cross: true,
					fixation_cross_color: "white", 
					fixation_cross_thickness: 6,
					post_trial_gap: 0, 
					choices: jsPsych.NO_KEYS,
					correct_choice: "q",
					trial_duration: 300,
					data: {experiment_part: 'ruletest_fixation', index_value: block} // lets index the block value here, so we can use it to indicate coherence
				}
				timeline.push(rule_fixation);

				var rule_rdk = {
					type: 'rdk', 
					background_color: "black",
					dot_color: "white", 
					aperture_type: 1,
					fixation_cross: true,
					fixation_cross_color: "white", 
					fixation_cross_thickness: 6,
					post_trial_gap: 0, 
					number_of_dots: 100,
					response_ends_trial: false,
					coherence: function () {
						return coherence_values[jsPsych.data.get().last(1).values()[0].index_value]; // we pull the block value from the data in the last trial block to index into coherence_values
					},
					move_distance: 2.5, // I've only approximated the MATLAB experiment here - that's 5 degrees per second (like .01 Hz/fps) this is in pixel lengths per second...
					dot_life: 7, // this is not the same as MATLAB - expressed in same units (frames of life), but MATLAB's 5 is visibly different to jsPsych's 5...
					choices: resp_keys,
					correct_choice: resp_keys[i_rule.match_arrow-1],
					coherent_direction: i_rule.coh_direction_deg_rdk, 
					trial_duration: 1500,
					data: {experiment_part: 'ruletest_rdk', rule_code: i_rule.rule_point_code}
				}
				var rule_feedback = { // you can use this for testing, otherwise comment out
					type: "html-keyboard-response",
					stimulus: function() {
						var last_rdk_accuracy = jsPsych.data.get().last(1).values()[0].correct; // dynamic var (runs throughout) asking for data.correct from last rdk block
						if (last_rdk_accuracy) { // if true (data.correct is boolean)
							return "<p>correct</p>";
						} else { // else if false
							return "<p>incorrect</p>"
						}
					},
					choices: jsPsych.NO_KEYS,
					trial_duration: 300,
					data: {experiment_part: 'ruletest_feedback'}
				}
				timeline.push(rule_rdk, rule_feedback);
			}
		}

		/* collecting data for analysis */
		var rule_analysis = {
			type: "html-keyboard-response",
			stimulus: "Now we analyse - press any key and please wait",
			data: {experiment_part: 'rule_analysis'},
			on_finish: function () {
				var payload = {
					data_array: []
				};
				for (i = 0; i < rule_point_values.length; i++) {
					tmp_trls = jsPsych.data.get().filter({experiment_part: 'ruletest_rdk', rule_code: i}).count();
					tmp_corr = jsPsych.data.get().filter({experiment_part: 'ruletest_rdk', correct: 1, rule_code: i}).count();
					payload['data_array'].push([rule_point_values[i],tmp_corr,tmp_trls]);
				}
				console.log("results to post: ", payload['data_array']);

				// POST the data to the psignifit function
				axios({
					url: 'http://localhost:5000/rule_thresholding',
					method: 'post',
					headers: {'Access-Control-Allow-Origin': 'http://localhost:5000/'},
					data: payload
				})
				.then(function (response) {
					console.log(response);
					hard_rule_value = response.data;
					console.log(hard_rule_value);
					rule_values = [hard_rule_value, 90-hard_rule_value]; // easy rule needs to be symmetrical to rule value for decoding analysis
				})
				.catch(function (error) {
					console.log(error);
				});
			}
		}
		timeline.push(rule_analysis);

		// var rule_values = [10, 80]; // will need to gen these also from earlier psychophys - [0] needs to be easy, [1] needs to be hard
    
		////////////////////////
		/* experiment testing */
		////////////////////////
       
		/* we'll run this as an 'on_finish' function, then push it all to the end of the timeline */

		var exp_start_screen = {
			type: "html-keyboard-response",
			stimulus: "<p>Now we're ready to begin the experiment.</p><br>"+
				"<p>This will take about 40 minutes.</p><br>"+
				"<p>Please wait patiently for the experiment to load based on the data so far</p><br>"+
				"<br><p>Press any key to begin.</p>",
			on_finish: function(){
			    jsPsych.pauseExperiment();

				/* init a timeline for the experiment */
				exp_timeline = [];

				/* define parameters to pass into the stimulus_array_generator function */
				var easy_rule = rule_values[0];
				var hard_rule = rule_values[1];
				var num_exp_blocks = 20;
				var num_trials_per_block = 64;
				// requires num_cues
				var num_motion_coherence = 8;

				/* generate stimulus array with stimulus_array_generator function */
				var exp_stim_array = exp_stimulus_array_generator(easy_rule, hard_rule, num_exp_blocks, num_trials_per_block, num_cues, num_motion_coherence);
				jsPsych.data.addProperties({
					exp_stim_array: exp_stim_array
				});

				/* generate experimental test procedure */
				var block;
				var trial;
				var count = 0;
				for (block = 0; block < exp_stim_array.length; block++) { // equivalent to number of blocks (exp_stim_array[0-n]) - should = num_blocks
					for (trial = 0; trial < exp_stim_array[0].length; trial++) { // equivalent to number of trials per block (exp_stim_array[x][0-n]) - should = num_trials_per_block
						count++; // use this to track how many trials have happened in total
						i_exp = exp_stim_array[block][trial]; // make this easier to call

						if (count === 1 || (count-1) % 8 === 0) { // show this on the first trial, then every 8 - this assumes that a cue change happens after a number divisible by 8 otherwise your participant is going to have dots corresponding to a cue they haven't seen yet 
							var exp_cue = {
								type: 'image-keyboard-response',
								stimulus: cues[i_exp.cue_dir-1].stimulus, // -1 because cue_dir goes from 1-4 and javascript indexes from 0-3
								stimulus_height: cueheight,
								choices: resp_keys,
								data: {experiment_part: 'experiment_cue'}
							}
							exp_timeline.push(exp_cue);
						}

						var exp_fixation = { // do an rdk block with invisible dots (since the html doesn't line up with the rdk canvas, the fixation appears to jump around)
							type: 'rdk',
							background_color: "black",
							dot_color: "black", 
							aperture_type: 1,
							fixation_cross: true,
							fixation_cross_color: "white", 
							fixation_cross_thickness: 6,
							post_trial_gap: 0, 
							choices: jsPsych.NO_KEYS,
							correct_choice: "q",
							trial_duration: 300,
							data: {experiment_part: 'experiment_fixation'}
						}
						exp_timeline.push(exp_fixation);

						var exp_rdk = {
							type: 'rdk', 
							background_color: "black",
							dot_color: "white", 
							aperture_type: 1,
							fixation_cross: true,
							fixation_cross_color: "white", 
							fixation_cross_thickness: 6,
							post_trial_gap: 0, 
							number_of_dots: 100,
							response_ends_trial: false,
							coherence: function(){coherence_values[i_exp.coh_difficulty-1]}, 
							move_distance: 2.5, // I've only approximated the MATLAB experiment here - that's 5 degrees per second (like .01 Hz/fps) this is in pixel lengths per second...
							dot_life: 7, // this is not the same as MATLAB - expressed in same units (frames of life), but MATLAB's 5 is visibly different to jsPsych's 5...
							choices: resp_keys,
							correct_choice: resp_keys[i_exp.match_arrow-1],
							coherent_direction: i_exp.dot_motion_dir_deg, 
							trial_duration: 1500,
							data: {experiment_part: 'experiment_rdk'}
						}
						var exp_feedback = { // you can use this for testing, otherwise comment out
							type: "html-keyboard-response",
							stimulus: function() {
								var last_rdk_accuracy = jsPsych.data.get().last(1).values()[0].correct; // dynamic var (runs throughout) asking for data.correct from last rdk block
								if (last_rdk_accuracy) { // if true (data.correct is boolean)
									return "<p>correct</p>";
								} else { // else if false
									return "<p>incorrect</p>"
								}
							},
							choices: jsPsych.NO_KEYS,
							trial_duration: 300,
							data: {experiment_part: 'experiment_feedback'}
						}
						exp_timeline.push(exp_rdk, exp_feedback);
					}
				}
    			jsPsych.addNodeToEndOfTimeline({
	      			timeline: exp_timeline // here is where we add it to the timeline
		    	}, jsPsych.resumeExperiment)
			}
		}
		timeline.push(exp_start_screen);