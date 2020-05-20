let ctxt, canvas_wrapper, canvasObject;
let frame_grad, key_frame_grad, pressed_keyline_grad, keyline_grad_tint;

let upleft = 700;
let downleft = 150;
const upper_noteline_width = 120;
const lower_noteline_width = 1100;

let lu, ru, ld, rd;

$(async()=>{
    await WebFont.load({
        google:{
            families: ['Orbitron', 'Open Sans']
        },
    });
    canvasWrapper = $('#canvas_wrapper');
    canvasObject = document.getElementById('bit_canvas');
    canvasObject.width = canvasWrapper.width();
    canvasObject.height = canvasWrapper.height();
    cw = canvasObject.width;
    ch = canvasObject.height;
    ctxt = canvasObject.getContext("2d");

    onDisplayChange();

    initializeCanvas();

    let delay = parseInt(1000/FPS);
    setInterval(function(){
        drawAll();
        updateNoteSet();
        updateHitEffects();
    }, delay);
});

function onDisplayChange(){
    canvasObject.width = canvasWrapper.width();
    canvasObject.height = canvasWrapper.height();
    cw = canvasObject.width;
    ch = canvasObject.height;

    upleft = cw/2 - upper_noteline_width/2;
    downleft = cw/2 - lower_noteline_width/2;
    lu = upleft;
    ru = cw - lu;
    ld = downleft;
    rd = cw - ld; 

    gux = cw*gux_offset_rate;
    gdy = ch*gdy_offset_rate;
    gh = ch*gh_offset_rate;
    gw = cw*gw_offset_rate;

    res_bar_max_width = gw/(hit_grade_result.length+1);
}

function drawAll(){
    eraseAll();
    drawFrame();
    drawNotes();
    drawHitEffects();
    drawGraphs();

    drawAccuracyBar();
    drawTexts();
}

function drawTexts(){
    ctxt.textAlign = "center";

    ctxt.font = "65px Open Sans";
    ctxt.fillStyle = "white";
    if(hit_time_error>0){
        ctxt.fillText(parseInt(hit_time_error)+" 느림", cw/2, 600);
    }else if(hit_time_error<0){
        ctxt.fillText(parseInt(-hit_time_error)+" 빠름", cw/2, 600);
    }else{
        ctxt.fillText(0+"", cw/2, 600);
    }
    

    ctxt.font = "25px Open Sans";
    ctxt.fillStyle = "yellow";
    ctxt.fillText(average_accuracy.toFixed(2)+"%", cw/2, 520);

    ctxt.font = "180px Orbitron";
    ctxt.fillStyle = "#BBBBBB75";
    ctxt.fillText(combo+"", cw/2, 300);
}

function updateHitEffects(){
    hit_effect_set.forEach(function(el, ind, obj){
        let timeDiff = getCurrentMillis() - el.startTime;
        if(timeDiff > hit_effect_alive_time){
            obj.splice(ind, 1);
            return;
        }
    });
}

function updateNoteSet(){
    note_set.forEach(function(el, ind, obj){
        if(el.pos > 1.5*ch){
            obj.splice(ind, 1);
            return;
        }else if(el.pos > (ch*hitline_yoffset + allow_note_error_lower_limit)){
            if(!el.isPassed)total_passed_note++;
            el.isPassed = true;
        }
        let elap = getCurrentMillis() - el.startTime;
        el.pos = note_speed_offset * Math.pow(pos_factor, elap) - pos_adjustment_offset;
        el.height = 5 * Math.pow(1.0015, elap);
    });
}

function captureNote(idx, hit_time){
    let touch_early = [];   // prevent double touch
    note_set.forEach(function(el){
        let found = false;
        for(let i=0; i<touch_early.length;i++){
            if(el.isPassed)continue;
            if(touch_early[i].key_idx == el.key_idx){
                found = true;
                let curr = getCurrentMillis();
                let original_gap = Math.abs(curr - touch_early[i].startTime - accurate_elapse_time);
                let new_gap = Math.abs(curr - el.startTime - accurate_elapse_time);
                if(original_gap > new_gap){
                    touch_early[i] = el;
                }
                break;
            }
        }
        if(!found){
            touch_early.push(el);
        }
    });

    touch_early.forEach(function(el){
        if(el.key_idx !== idx) return;
        let time_diff = hit_time - el.startTime;    // note alive time

        let real_pos = note_speed_offset * Math.pow(pos_factor, time_diff) - pos_adjustment_offset;
        let pos_error = real_pos - (ch*hitline_yoffset - pos_adjustment_offset);
        console.log(real_pos + "," + pos_error);
        if(pos_error <= allow_note_error_lower_limit && pos_error >= -allow_note_error_upper_limit){
            if(!el.isPassed){
                // Success to Hit
                hit_time_error = time_diff - accurate_elapse_time;
                hit_accuracy = 100*(1-Math.abs(hit_time_error/max_hit_early_time));
                hit_accuracy_sum += hit_accuracy;
                hit_accuracy_num++;
                average_accuracy = hit_accuracy_num == 0?0:(hit_accuracy_sum/hit_accuracy_num);

                total_passed_note++;
                total_completed_note++;
                combo++;
                el.isSuccess = true;

                for(let i=0;i<hit_grade_result.length;i++){
                    if(hit_accuracy <= hit_grade_result[i].accuracy_cut){
                        hit_grade_result[i].total++;
                        break;
                    }
                }

                hit_effect_set.push({
                    startTime: getCurrentMillis(),
                    effect_pos: real_pos,
                    effect_height: el.height,
                    key_idx: idx,
                });
            }
            el.isPassed = true;
        }
    });
}

function drawHitEffects(){
    hit_effect_set.forEach(function(el, ind, obj){
        let proc_rate = (getCurrentMillis() - el.startTime)/hit_effect_alive_time;
        drawEffect(el, proc_rate)
    });
}

function createNote(idx){
    note_set.push({
        key_n: key_num,
        key_idx: idx,
        pos: 0,
        height: 0,
        isPassed: false,
        isSuccess: false,
        startTime: new Date().getTime(),
    });
}

function createRandomNote(){
    createNote(getRandomInt(0, key_num));
}

function initializeCanvas(){
    accurate_elapse_time = dlog(pos_factor, (hitline_yoffset * ch + pos_adjustment_offset) /note_speed_offset);
    hit_early_judgement_time = dlog(pos_factor, (hitline_yoffset * ch + pos_adjustment_offset - allow_note_error_upper_limit) / note_speed_offset);
    max_hit_early_time = accurate_elapse_time - hit_early_judgement_time;

    frame_grad = ctxt.createLinearGradient(0,0,0,ch);
    frame_grad.addColorStop(0, "#9999FF20");
    frame_grad.addColorStop(1, "#CCCCFF");

    key_frame_grad = ctxt.createLinearGradient(0,0,0,ch);
    key_frame_grad.addColorStop(0, "#9999FF20");
    key_frame_grad.addColorStop(1, "#CCCCFF30");

    pressed_keyline_grad = ctxt.createLinearGradient(0,0,0,ch);
    pressed_keyline_grad.addColorStop(0, "#FFFFFF00");
    pressed_keyline_grad.addColorStop(1, "#FFFFAA2A");

    keyline_grad_tint = ctxt.createLinearGradient(0,0,0,ch);
    keyline_grad_tint.addColorStop(0, "#FFFFFF00");
    keyline_grad_tint.addColorStop(1, "#FFFFFF0C");
}

function drawGraphs(){
    // draw frames
    ctxt.strokeStyle = "#FFFFFF77";
    ctxt.beginPath();
    ctxt.moveTo(gux, gdy - gh);
    ctxt.lineTo(gux, gdy);
    ctxt.lineTo(gux + gw, gdy);
    ctxt.stroke();

    res_value_total = 0;
    hit_grade_result.forEach(function(grade, idx){
        if(grade.total > res_bar_max_value) res_bar_max_value = grade.total;
        res_value_total += grade.total;
    });

    ctxt.font = "10px source sans";

    hit_grade_result.forEach(function(grade, idx){
        let x_offset = gux + res_bar_max_width * (idx+1);
        let bar_width = res_bar_max_width * res_bar_width_factor;

        let innerHeight = res_bar_max_value==0?0:(gh - res_bar_min_height) * (grade.total/res_bar_max_value);
        let score_rate = res_value_total==0?0:grade.total/res_value_total;
        let bar_height = innerHeight + res_bar_min_height;

        ctxt.fillStyle = grade.color;
        ctxt.fillRect(x_offset - bar_width/2, gdy - bar_height, bar_width, bar_height);
        ctxt.fillText(grade.total+"", x_offset, gdy + 30);
        ctxt.fillText(parseInt(100*score_rate)+"%", x_offset, gdy - bar_height - 15);

        ctxt.fillStyle = grade.label_color;
        ctxt.fillText(grade.label, x_offset, gdy + 15);
    });
}

function drawAccuracyBar(){
    ctxt.fillStyle = "#55F";
    let accuracy = average_accuracy/100;
    cur_hit_accuracy_effect = (accuracy - cur_hit_accuracy_effect) * 0.1 + cur_hit_accuracy_effect;
    let height = cur_hit_accuracy_effect*ch;
    ctxt.fillRect(cw-10, ch - height, 10, height);
}

function drawNotes(){
    note_set.forEach(function(note){
        if(note.key_idx >= key_num) return;
        ctxt.fillStyle = note.isSuccess?"#FFFFFF00":(note.isPassed?"#AAAAAA33":"#F9A");
        let real_pos = note.pos;
        let uy_offset_rate = parseFloat(real_pos - note.height)/parseFloat(ch);
        let dy_offset_rate = parseFloat(real_pos)/parseFloat(ch);

        let x_min = parseFloat(note.key_idx*(ru - lu))/parseFloat(key_num) + lu;
        let x_max = parseFloat(note.key_idx*(rd - ld))/parseFloat(key_num) + ld;
        let wmax = parseFloat(rd - ld)/parseFloat(key_num);
        let wmin = parseFloat(ru - lu)/parseFloat(key_num);
        let segment_ldx = x_max * dy_offset_rate + x_min * (1-dy_offset_rate);
        let segment_ldy = ch * dy_offset_rate;
        let segment_dwidth = wmax * dy_offset_rate + wmin * (1-dy_offset_rate);

        let segment_lux = x_max * uy_offset_rate + x_min * (1-uy_offset_rate);
        let segment_luy = ch * uy_offset_rate;
        let segment_uwidth = wmax * uy_offset_rate + wmin * (1-uy_offset_rate);

        ctxt.beginPath();
        ctxt.moveTo(segment_ldx, segment_ldy);
        ctxt.lineTo(segment_ldx + segment_dwidth, segment_ldy);
        ctxt.lineTo(segment_lux + segment_uwidth, segment_luy);
        ctxt.lineTo(segment_lux, segment_luy);
        ctxt.closePath();
        ctxt.fill();
    });
}

function eraseAll(){
    fillEntire("rgb(0,0,0)");
}

function fillEntire(color){
    ctxt.fillStyle = color;
    ctxt.fillRect(0, 0, cw, ch);
}

function drawFrame(){
    //draw hit line
    ctxt.fillStyle = "red";
    let line_stx = lu * (1-hitline_yoffset) + ld * hitline_yoffset;
    let line_sty = hitline_yoffset * ch;
    ctxt.beginPath();
    ctxt.moveTo(line_stx, line_sty);
    ctxt.lineTo(cw - line_stx, line_sty);
    ctxt.lineTo(cw - line_stx, line_sty-2);
    ctxt.lineTo(line_stx, line_sty-2);
    ctxt.closePath();
    ctxt.fill();

    //draw main frame
    ctxt.fillStyle = frame_grad;
    ctxt.beginPath();
    ctxt.moveTo(upleft, 0);
    ctxt.lineTo(downleft, ch);
    ctxt.lineTo(downleft+10, ch);
    ctxt.lineTo(upleft+3, 0);
    ctxt.closePath();
    ctxt.fill();

    ctxt.beginPath();
    ctxt.moveTo(cw-upleft, 0);
    ctxt.lineTo(cw-downleft, ch);
    ctxt.lineTo(cw-(downleft+10), ch);
    ctxt.lineTo(cw-(upleft+3), 0);
    ctxt.closePath();
    ctxt.fill();

    //draw segment line
    for(let i=1;i<=key_num;i++){
        let segment_high = parseFloat(i*(ru - lu))/parseFloat(key_num) + lu;
        let segment_low = parseFloat(i*(rd - ld))/parseFloat(key_num) + ld;
        let dwidth = parseFloat(rd - ld)/parseFloat(key_num);

        let idx = i-1;
        ctxt.font = "40px source sans normal";
        ctxt.fillStyle = "white";
        ctxt.fillText(cur_key_set[idx], segment_low - dwidth/2, ch - 10);

        if(idx%2==1)drawLineTint(idx);


        ctxt.fillStyle = key_frame_grad;
        if(i == key_num)break;
        ctxt.beginPath();
        ctxt.moveTo(segment_high, 0);
        ctxt.lineTo(segment_low, ch);
        ctxt.lineTo(segment_low+2, ch);
        ctxt.lineTo(segment_high+1, 0);
        ctxt.closePath();
        ctxt.fill();
    }

    //draw pressline
    switch(key_set_index){
        case 0:
            if(key_listener.space) drawPushedLine(0);
            break;
        case 1:
            if(key_listener.d) drawPushedLine(0);
            if(key_listener.f) drawPushedLine(1);
            if(key_listener.j) drawPushedLine(2);
            if(key_listener.k) drawPushedLine(3);
            break;
        case 2:
            if(key_listener.d) drawPushedLine(0);
            if(key_listener.f) drawPushedLine(1);
            if(key_listener.space) drawPushedLine(2);
            if(key_listener.j) drawPushedLine(3);
            if(key_listener.k) drawPushedLine(4);
            break;
        case 3:
            if(key_listener.s) drawPushedLine(0);
            if(key_listener.d) drawPushedLine(1);
            if(key_listener.f) drawPushedLine(2);
            if(key_listener.j) drawPushedLine(3);
            if(key_listener.k) drawPushedLine(4);
            if(key_listener.l) drawPushedLine(5);
            break;
        case 4:
            if(key_listener.a) drawPushedLine(0);
            if(key_listener.s) drawPushedLine(1);
            if(key_listener.d) drawPushedLine(2);
            if(key_listener.l) drawPushedLine(3);
            if(key_listener.l1r) drawPushedLine(4);
            if(key_listener.l2r) drawPushedLine(5);
            break;
        case 5:
            if(key_listener.s) drawPushedLine(0);
            if(key_listener.d) drawPushedLine(1);
            if(key_listener.f) drawPushedLine(2);
            if(key_listener.space) drawPushedLine(3);
            if(key_listener.j) drawPushedLine(4);
            if(key_listener.k) drawPushedLine(5);
            if(key_listener.l) drawPushedLine(6);
            break;
    }
}

function drawPushedLine(idx){
    let segment_high = parseFloat(idx*(ru - lu))/parseFloat(key_num) + lu;
    let segment_low = parseFloat(idx*(rd - ld))/parseFloat(key_num) + ld;
    let uwidth = parseFloat(ru - lu)/parseFloat(key_num);
    let dwidth = parseFloat(rd - ld)/parseFloat(key_num);

    let llu = segment_high;
    let lru = segment_high + uwidth;
    let lld = segment_low;
    let lrd = segment_low + dwidth;

    ctxt.fillStyle = pressed_keyline_grad;
    ctxt.beginPath();
    ctxt.moveTo(llu, 0);
    ctxt.lineTo(lld, ch);
    ctxt.lineTo(lrd, ch);
    ctxt.lineTo(lru, 0);
    ctxt.closePath();
    ctxt.fill();
}

function drawLineTint(idx){
    let segment_high = parseFloat(idx*(ru - lu))/parseFloat(key_num) + lu;
    let segment_low = parseFloat(idx*(rd - ld))/parseFloat(key_num) + ld;
    let uwidth = parseFloat(ru - lu)/parseFloat(key_num);
    let dwidth = parseFloat(rd - ld)/parseFloat(key_num);

    let llu = segment_high;
    let lru = segment_high + uwidth;
    let lld = segment_low;
    let lrd = segment_low + dwidth;

    ctxt.fillStyle = keyline_grad_tint;
    ctxt.beginPath();
    ctxt.moveTo(llu, 0);
    ctxt.lineTo(lld, ch);
    ctxt.lineTo(lrd, ch);
    ctxt.lineTo(lru, 0);
    ctxt.closePath();
    ctxt.fill();
}

function drawEffect(el, proc_rate){
    let idx = el.key_idx;
    let segment_high = parseFloat(idx*(ru - lu))/parseFloat(key_num) + lu;
    let segment_low = parseFloat(idx*(rd - ld))/parseFloat(key_num) + ld;
    let uwidth = parseFloat(ru - lu)/parseFloat(key_num);
    let dwidth = parseFloat(rd - ld)/parseFloat(key_num);

    let uy = el.effect_pos - el.effect_height;
    let dy = el.effect_pos;

    let uyr = uy/ch;
    let dyr = dy/ch;

    let uw = uwidth * (1-uyr) + dwidth * uyr;
    let dw = uwidth * (1-dyr) + dwidth * dyr;
    let ux = segment_high * (1-uyr) + segment_low * uyr;
    let dx = segment_high * (1-dyr) + segment_low * dyr;

    let llu = ux;
    let lru = ux + uw;
    let lld = dx;
    let lrd = dx + dw;

    ctxt.fillStyle = "rgba(51, 153, 256, "+0.8*(1-proc_rate)+")";
    ctxt.beginPath();
    ctxt.moveTo(llu, uy);
    ctxt.lineTo(lld, dy);
    ctxt.lineTo(lrd, dy);
    ctxt.lineTo(lru, uy);
    ctxt.closePath();
    ctxt.fill();
}