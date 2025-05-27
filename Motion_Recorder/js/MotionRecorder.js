class MotionRecorder {
  constructor() {
    this.stepDescriptions = [
      "", // Step 0 (Setup)
      "Get Ready\nHold your phone steady in your hand, in the position described above.\nWhen you press the Start button, the system will record your movement for 3 seconds.\nNote: Recording starts only after you press Start.",
      "Step 1: Read the instructions carefully.\n Step 2: Press the Button to start the measurement.\n Step 3: Turn left for 90° degree. Try to turn so long as the green bar load is loading.\n Step 4: Repeat this 8 times.\n You can use the button to start the train for training.",
      "Get Ready\nHold your phone still in your hand.\nPress the Start button and wait while your movement is recorded for 3 seconds.",
      "Step 1: Read the instructions carefully.\n Step 2: Press the Button to start the measurement.\n Step 3: Turn right for 90° degree. Try to turn so long as the green bar load is loading.\n Step 4: Repeat this 8 times.",
      "Get Ready\nHold your phone still in your hand.",
      "Step 1: Read the instructions carefully.\n Step 2: Press the Button to start the measurement.\n Step 3: Walk forward so long as the green bar load is loading.\n Step 4: Repeat this 8 times.",
      "Get Ready\nHold your phone still.",
      "Step 1: Read the instructions carefully.\n Step 2: Press the Button to start the measurement.\n Step 3: Walk backforward so long as the green bar load is loading.\n Step 4: Repeat this 8 times.",
      " Get Ready\nHold your phone still.",
      "Step 1: Read the instructions carefully.\n Step 2: Press the Button Stairs up and walk up a staircase slowly and carefully so long as the green bar load is loading.\n Step 3: Turn slowly and carefully.\n Step 4: Press the Button Stairs down and walk down a staircase slowly and carefully so long as the green bar load is loading.\n Step 5: Repeat this 8 times.",
      " Get Ready\nHold your phone still.",
      " Final Pause \nHold your phone still.\nRepeat this 2 times."
    ];

    this.steps = [
      { label: "wait", count: 1 },
      { label: "left", count: 8 },
      { label: "wait", count: 1 },
      { label: "right", count: 8 },
      { label: "wait", count: 1 },
      { label: "forward", count: 8 },
      { label: "wait", count: 1 },
      { label: "backward", count: 8 },
      { label: "wait", count: 1 },
      { label: "stairs_up_down", count: 8 },
      { label: "wait", count: 3 },
    ];

    this.measurementDuration = 2900;
    this.minSampleInterval = 100;
    this.counterClockwise = -90;
    this.clockwise = 90;

    this.userName = "";
    this.userDevice = "";
    this.currentStep = 0;
    this.repetition = 0;
    this.motionData = [];
    this.recording = false;
    this.recordingStartTime = 0;
    this.lastSampleTime = 0;
    this.currentAngleLeft = 0;
    this.currentAngleRight = 0;
    this.currentStairsLabel = "";
    this.repetitionStairsUp = 0;
    this.repetitionStairsDown = 0;
    this.repetitionWait = 0;
    this.lastVectorAngle = 0;
  }

  init() {
    document.getElementById("setup").querySelector("button").onclick = () => this.startExperiment();
    document.getElementById("nextButton").onclick = () => this.startMeasurement();
    document.querySelectorAll("#stairs-buttons button").forEach(button => {
      button.onclick = () => this.startStairsMeasurement(button.textContent.includes("Up") ? 'stairs_up' : 'stairs_down');
    });
    document.querySelector("#done button").onclick = () => this.downloadCSV();
  }

  startExperiment() {
    this.userName = document.getElementById("name").value.trim();
    this.userDevice = document.getElementById("device").value.trim();

    if (!this.userName || !this.userDevice) {
      alert("Please enter your name and device.");
      return;
    }

    document.getElementById("setup").style.display = "none";
    document.getElementById("experiment").style.display = "block";
    this.enableMotionListener();
    this.updateStepDisplay();
  }

  enableMotionListener() {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission().then(permission => {
        if (permission === "granted") window.addEventListener("devicemotion", (e) => this.handleMotion(e));
        else alert("Motion permission denied.");
      }).catch(alert);
    } else {
      window.addEventListener("devicemotion", (e) => this.handleMotion(e));
    }
  }

  handleMotion(event) {
    const now = Date.now();
    if (!this.recording || now - this.lastSampleTime < this.minSampleInterval) return;
    this.lastSampleTime = now;

    const acc = event.acceleration || {}, rot = event.rotationRate || {};
    const time = now - this.recordingStartTime;

    let label = this.steps[this.currentStep].label;
    if (label === "stairs_up_down") {
      label = this.currentStairsLabel || "stairs";
    }

    let segment = "";
    if (label === "stairs_up") {
      segment = `${label}_${this.repetitionStairsUp + 1}`;
    } else if (label === "stairs_down") {
      segment = `${label}_${this.repetitionStairsDown + 1}`;
    } else if (label === "wait") {
      segment = `${label}_${this.repetitionWait + 1}`;
    } else {
      segment = `${label}_${this.repetition + 1}`;
    }

    this.motionData.push([
      time, acc.x ?? "", acc.y ?? "", acc.z ?? "",
      rot.alpha ?? "", rot.beta ?? "", rot.gamma ?? "",
      label, segment
    ]);

    document.getElementById("motion").innerHTML =
      `Acc: x=${acc.x?.toFixed(2) ?? "?"}, y=${acc.y?.toFixed(2) ?? "?"}, z=${acc.z?.toFixed(2) ?? "?"} | ` +
      `Rot: α=${rot.alpha?.toFixed(2) ?? "?"}, β=${rot.beta?.toFixed(2) ?? "?"}, γ=${rot.gamma?.toFixed(2) ?? "?"}`;
  }

  updateStepDisplay() {
    const step = this.steps[this.currentStep];
    document.getElementById("stepTitle").textContent = `Perform: ${step.label}`;
    document.getElementById("counterDisplay").textContent = `${this.repetition + 1} / ${step.count}`;
    document.getElementById("experimentInstruction").textContent = this.stepDescriptions[this.currentStep + 1] || "";
    document.getElementById("status").textContent = "Press start for next segment.";
    document.getElementById("progressBar").style.width = "0%";

    document.getElementById("circle-container-left").style.display = this.currentStep == 1 ? "block" : "none";
    document.getElementById("circle-container-right").style.display = this.currentStep == 3 ? "block" : "none";

    if (this.currentStep == 3) {
      const vector = document.getElementById("vector-right");
      vector.style.transition = "none";
      vector.style.transform = `rotate(${this.lastVectorAngle}deg)`;
    }

    if (this.currentStep == 9) {
      document.getElementById("stairs-buttons").style.display = "block";
      document.getElementById("nextButton").style.display = "none";
      document.getElementById("counterDisplay").textContent =
        `Stairs Up: ${this.repetitionStairsUp} / ${step.count}, Down: ${this.repetitionStairsDown} / ${step.count}`;
    } else {
      document.getElementById("stairs-buttons").style.display = "none";
      document.getElementById("nextButton").style.display = "block";
    }
  }

  startMeasurement() {
    const btn = document.getElementById("nextButton");
    const progress = document.getElementById("progressBar");

    btn.disabled = true;
    btn.style.backgroundColor = "#28a745";
    this.recording = true;
    this.recordingStartTime = Date.now();
    document.getElementById("status").textContent = "Recording...";

    if (this.currentStep == 1) this.startAnimation(this.counterClockwise);
    if (this.currentStep == 3) this.startAnimation(this.clockwise, this.lastVectorAngle);

    progress.style.transition = "none";
    progress.style.width = "0%";
    void progress.offsetWidth;
    progress.style.transition = `width ${this.measurementDuration}ms linear`;
    progress.style.width = "100%";

    setTimeout(() => {
      this.recording = false;
      document.getElementById("status").textContent = "Done.";
      btn.disabled = false;
      btn.style.backgroundColor = "#007bff";
      progress.style.transition = "none";
      progress.style.width = "0%";

      if (this.steps[this.currentStep].label === "wait") this.repetitionWait++;
      this.repetition++;
      if (this.repetition >= this.steps[this.currentStep].count) {
        this.repetition = 0;
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
          document.getElementById("experiment").style.display = "none";
          document.getElementById("done").style.display = "block";
          return;
        }
      }
      this.updateStepDisplay();
    }, this.measurementDuration);
  }

  startStairsMeasurement(label) {
    const progress = document.getElementById("progressBar");
    const maxReps = this.steps[this.currentStep].count;

    if ((label === "stairs_up" && this.repetitionStairsUp >= maxReps) ||
        (label === "stairs_down" && this.repetitionStairsDown >= maxReps)) {
      return;
    }

    this.currentStairsLabel = label;
    this.recording = true;
    this.recordingStartTime = Date.now();
    document.getElementById("status").textContent = `Recording (${label})...`;

    progress.style.transition = "none";
    progress.style.width = "0%";
    void progress.offsetWidth;
    progress.style.transition = `width ${this.measurementDuration}ms linear`;
    progress.style.width = "100%";

    setTimeout(() => {
      this.recording = false;
      document.getElementById("status").textContent = "Done.";
      progress.style.transition = "none";
      progress.style.width = "0%";

      if (label === "stairs_up") {
        this.repetitionStairsUp++;
        if (this.repetitionStairsUp >= maxReps) {
          document.querySelector('button[onclick*="stairs_up"]').disabled = true;
        }
      } else if (label === "stairs_down") {
        this.repetitionStairsDown++;
        if (this.repetitionStairsDown >= maxReps) {
          document.querySelector('button[onclick*="stairs_down"]').disabled = true;
        }
      }

      document.getElementById("counterDisplay").textContent =
        `Stairs Up: ${this.repetitionStairsUp} / ${maxReps}, Down: ${this.repetitionStairsDown} / ${maxReps}`;

      if (this.repetitionStairsUp >= maxReps && this.repetitionStairsDown >= maxReps) {
        this.repetitionStairsUp = 0;
        this.repetitionStairsDown = 0;
        this.currentStep++;
        this.repetition = 0;
        this.updateStepDisplay();
      }
    }, this.measurementDuration);
  }

  startAnimation(rotationAngle, initialAngle = null) {
    const label = this.steps[this.currentStep].label;
    let vector = null;
    let angle = 0;

    if (label === "left") {
      if (initialAngle !== null) this.currentAngleLeft = initialAngle;
      this.currentAngleLeft += rotationAngle;
      angle = this.currentAngleLeft;
      vector = document.getElementById("vector-left");
    }
    else if (label === "right") {
      if (initialAngle !== null) this.currentAngleRight = initialAngle;
      this.currentAngleRight += rotationAngle;
      angle = this.currentAngleRight;
      vector = document.getElementById("vector-right");
    }
    else {
      return;
    }

    vector.style.transition = `transform ${this.measurementDuration}ms linear`;
    vector.style.transform = `rotate(${angle}deg)`;

    const progress = document.getElementById("progressBar");
    progress.style.transition = `width ${this.measurementDuration}ms linear`;
    progress.style.width = "100%";

    setTimeout(() => {
      progress.style.transition = "none";
      progress.style.width = "0%";
      setTimeout(() => {
        progress.style.transition = `width ${this.measurementDuration}ms linear`;
      }, 50);
    }, this.measurementDuration + 50);
    this.lastVectorAngle = angle;
  }

  downloadCSV() {
    const safeName = this.userName.replace(/\s+/g, "_").toLowerCase();
    const safeDevice = this.userDevice.replace(/\s+/g, "_").toLowerCase();
    const filename = `motion_${safeName}_${safeDevice}.csv`;
    const csv = [
      "time_ms,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,label,segment_id",
      ...this.motionData.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const app = new MotionRecorder();
app.init();
