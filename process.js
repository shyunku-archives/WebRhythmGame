const key_set = [
    ["="], ["D", "F", "J", "K"], ["D", "F", "=", "J", "K"],
    ["S", "D", "F", "J", "K", "L"], ["S", "D", "F", "=", "J", "K", "L"],
];

// Global
const FPS = 60;
let bpm = 0;
let combo = 0;

// Key Set
let key_set_index = 3;
let key_num = 6;
let cur_key_set = key_set[key_set_index];

// Window
let cw, ch;

// Notes
let total_passed_note = 0;
let total_completed_note = 0;
let note_set = [];
const note_speed_offset = 120;
let pos_factor = 1.0015;

// Hit Judgement
const allow_note_error_upper_limit = 300;
const allow_note_error_lower_limit = 300;
const hitline_yoffset = 0.8;

let accurate_elapse_time;
let hit_early_judgement_time;
let max_hit_early_time;

let hit_time_error = 0;
let hit_accuracy = 0;

const pos_adjustment_offset = note_speed_offset + 30;

// Accuracy calc
let hit_accuracy_sum = 0;
let hit_accuracy_num = 0;
let average_accuracy = 0;
let cur_hit_accuracy_effect = 0;    // bar

// Effects
let hit_effect_set = [];
const hit_effect_alive_time = 800;
const hit_effect_up_yrate = hitline_yoffset - 0.05;
const hit_effect_down_yrate = hitline_yoffset;

// Result Graph
const gux_offset_rate = 0.8;
const gdy_offset_rate = 0.2;
const gw_offset_rate = 0.15;
const gh_offset_rate = 0.12;
let gux, gdy, gh, gw;
const hit_grade_result = [
    {accuracy_cut: 10, color: "#FF000050", total: 0, label: "Bad", label_color: "#FF0000FF"},        // 0~10%
    {accuracy_cut: 40, color: "#FF880050", total: 0, label: "Normal", label_color: "#FF8800FF"},     // 10~40%
    {accuracy_cut: 80, color: "#FFFF0050", total: 0, label: "Good", label_color: "#FFFF00FF"},     // 40~80%
    {accuracy_cut: 95, color: "#00FF0050", total: 0, label: "Excellent", label_color: "#00FF00FF"},      // 80~95%
    {accuracy_cut: 100, color: "#00AAFF50", total: 0, label: "Perfect", label_color: "#00AAFFFF"},      // 95~100%
]
let res_bar_max_value = 0;
let res_bar_max_width;
let res_value_total = 0;
const res_bar_width_factor = 0.5;
const res_bar_min_height = 3;      // default height

let key_listener = {
    s: false,
    d: false,
    f: false,
    space: false,
    j: false,
    k: false,
    l: false,
    st: 0,
    dt: 0,
    ft: 0,
    spacet: 0,
    j: 0,
    k: 0,
    l: 0,
};

$(()=>{
    const option_apply_btn = $('#option_apply_btn');
    const bpm_selector = $('#set_bpm_input');
    const cur_bpm = $('#current_bpm');
    const cur_key = $('#current_key');
    let updateLoop;
    
    option_apply_btn.on("click", function(){
        bpm = bpm_selector.val();
        cur_bpm.text(bpm+"("+(bpm/60).toFixed(2)+")");

        //update bpm
        clearInterval(updateLoop);
        if(bpm != 0){
            updateLoop = setInterval(()=>{
                createRandomNote();
                // createNote(2);
            }, 60000/bpm);
        }

        key_set_index = parseInt($('#key_set option:selected').val());
        cur_key_set = key_set[key_set_index];
        key_num = cur_key_set.length;

        cur_key.text(key_num);
    });

    $(this).resize(function(){
        onDisplayChange();
    });

    $(this).keypress(function(e){
        let kcode = e.keyCode;
        
        switch(key_set_index){
            case 0: // 1 key
                if(key_listener.space) captureNote(0, key_listener.spacet);
                break;
            case 1:
                if(key_listener.d) captureNote(0, key_listener.dt);
                if(key_listener.f) captureNote(1, key_listener.ft);
                if(key_listener.j) captureNote(2, key_listener.jt);
                if(key_listener.k) captureNote(3, key_listener.kt);
                break;
            case 2:
                if(key_listener.d) captureNote(0, key_listener.dt);
                if(key_listener.f) captureNote(1, key_listener.ft);
                if(key_listener.space) captureNote(2, key_listener.spacet);
                if(key_listener.j) captureNote(3, key_listener.jt);
                if(key_listener.k) captureNote(4, key_listener.kt);
                break;
            case 3:
                if(key_listener.s) captureNote(0, key_listener.st);
                if(key_listener.d) captureNote(1, key_listener.dt);
                if(key_listener.f) captureNote(2, key_listener.ft);
                if(key_listener.j) captureNote(3, key_listener.jt);
                if(key_listener.k) captureNote(4, key_listener.kt);
                if(key_listener.l) captureNote(5, key_listener.lt);
                break;
            case 4:
                if(key_listener.s) captureNote(0, key_listener.st);
                if(key_listener.d) captureNote(1, key_listener.dt);
                if(key_listener.f) captureNote(2, key_listener.ft);
                if(key_listener.space) captureNote(3, key_listener.spacet);
                if(key_listener.j) captureNote(4, key_listener.jt);
                if(key_listener.k) captureNote(5, key_listener.kt);
                if(key_listener.l) captureNote(6, key_listener.lt);
                break;
            }
    });

    $(this).keydown(function(e){
        let kcode = e.keyCode;

        switch(kcode){
        case 83: 
            if(!key_listener.s) key_listener.st = getCurrentMillis();
            key_listener.s = true; 
            
            break;
        case 68:
            if(!key_listener.d) key_listener.dt = getCurrentMillis();
            key_listener.d = true; 
            
            break;
        case 70:
            if(!key_listener.f) key_listener.ft = getCurrentMillis();
            key_listener.f = true; 
            
            break;
        case 32:
            if(!key_listener.space) key_listener.spacet = getCurrentMillis();
            key_listener.space = true; 
            
            break;
        case 74:
            if(!key_listener.j) key_listener.jt = getCurrentMillis();
            key_listener.j = true; 
            
            break;
        case 75:
            if(!key_listener.k) key_listener.kt = getCurrentMillis();
            key_listener.k = true; 
            
            break;
        case 76:
            if(!key_listener.l) key_listener.lt = getCurrentMillis();
            key_listener.l = true; 
            
            break;
        }
    });

    $(this).keyup(function(e){
        let kcode = e.keyCode;

        switch(kcode){
            case 83: key_listener.s = false; break;
            case 68: key_listener.d = false; break;
            case 70: key_listener.f = false; break;
            case 32: key_listener.space = false; break;
            case 74: key_listener.j = false; break;
            case 75: key_listener.k = false; break;
            case 76: key_listener.l = false; break;
        }
    });
});