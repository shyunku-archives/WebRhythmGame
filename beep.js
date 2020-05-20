const minFreq = 100;
const maxFreq = 1300;
const audioContext = new AudioContext();

function beepWithFreq(vol, freq, duration){
    let oscil = audioContext.createOscillator();
    let rgain = audioContext.createGain();

    oscil.connect(rgain);
    oscil.frequency.value = freq;
    oscil.type="sine";

    rgain.connect(audioContext.destination);
    rgain.gain.value = vol*0.01;
    oscil.start(audioContext.currentTime);
    oscil.stop(audioContext.currentTime + duration*0.001);
}