

class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(label, callback) {
    if (!this.listeners[label]) {
      this.listeners[label] = [];
    }
    this.listeners[label].push(callback);
  }

  off(label, callback) {
    let listeners = this.listeners[label];

    if (listeners && listeners.length > 0) {
      let index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        this.listeners[label] = listeners;
        return true;
      }
    }
    return false;
  }

  emit(label, ...args) {
    let listeners = this.listeners[label];

    if (listeners && listeners.length > 0) {
      listeners.forEach((listener) => {
        listener(...args);
      });
      return true;
    }
    return false;
  }
}

export class BluetoothServer extends EventEmitter {
  constructor() {
    super();
    this._onCharacteristicValueChanged = this._onCharacteristicValueChanged.bind(this);
    this._onDisconnected = this._onDisconnected.bind(this);
  }

  async connect() {
    console.log("connect func in")
    if (!window.navigator) {
      throw new Error('window.navigator is not accesible. Maybe you\'re running Node.js?');
    }

    if (!window.navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not accesible');
    }

    const device = await window.navigator.bluetooth.requestDevice({
      filters: [{
        // namePrefix: 'GiC',
        namePrefix: 'r',
      }],
      optionalServices: [SERVICE_UUID, SYSTEM_SERVICE_UUID],
    });

    console.log("wait connecting....")
    const server = await device.gatt.connect();
    console.log("connect done")
    const service = await server.getPrimaryService(SERVICE_UUID);
    console.log("service", service)
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUIDS[0])
    await characteristic.startNotifications();
    const value = await characteristic.readValue();
    console.log("value", value)
    // this._state = this._parseCubeValue(value).state;
    characteristic.addEventListener('characteristicvaluechanged', this._onCharacteristicValueChanged);
    //
    // this._systemService = await server.getPrimaryService(SYSTEM_SERVICE_UUID);
    //
    // device.addEventListener('gattserverdisconnected', this._onDisconnected);

    this._device = device;
  }

  /**
   * Disconnects from the GiiKER cube. Will fire the `disconnected` event once done.
   */
  disconnect() {
    if (!this._device) {
      return;
    }
    this._device.gatt.disconnect();
  }

  _onDisconnected() {
    this._device = null;
    this.emit('disconnected');
  }

  /**
   * Returns a promise that will resolve to the battery level
   */
  async getBatteryLevel() {
    const readCharacteristic = await this._systemService.getCharacteristic(SYSTEM_READ_UUID);
    const writeCharacteristic = await this._systemService.getCharacteristic(SYSTEM_WRITE_UUID);
    await readCharacteristic.startNotifications();
    const data = new Uint8Array([0xb5]).buffer;
    writeCharacteristic.writeValue(data);

    return new Promise((resolve) => {
      const listener = (event) => {
        const value = event.target.value;
        readCharacteristic.removeEventListener('characteristicvaluechanged', listener);
        readCharacteristic.stopNotifications();
        resolve(value.getUint8(1));
      };
      readCharacteristic.addEventListener('characteristicvaluechanged', listener);
    });
  }

  /**
   * Returns the current state of the cube as arrays of corners and edges.
   *
   * Example how to interpret the state:
   *
   * Corner:
   * ```
   *   {
   *     position: ['D', 'R', 'F'],
   *     colors: ['yellow', 'red', 'green']
   *   }
   * ```
   * The corner in position DRF has the colors yellow on D, red on R and green ON F.
   *
   * Edge:
   * ```
   *   {
   *     position: ['F', 'U'],
   *     colors: ['green', 'white']
   *   }
   * ```
   * The edge in position FU has the colors green on F and white on U.
   */
  get state() {
    const state = {
      corners: [],
      edges: []
    };
    this._state.cornerPositions.forEach((cp, index) => {
      const mappedColors = this._mapCornerColors(
        cornerColors[cp - 1],
        this._state.cornerOrientations[index],
        index
      );
      state.corners.push({
        position: cornerLocations[index].map((f) => faces[f]),
        colors: mappedColors.map((c) => colors[c])
      });
    });
    this._state.edgePositions.forEach((ep, index) => {
      const mappedColors = this._mapEdgeColors(
        edgeColors[ep - 1],
        this._state.edgeOrientations[index]
      );
      state.edges.push({
        position: edgeLocations[index].map((f) => faces[f]),
        colors: mappedColors.map((c) => colors[c])
      });
    });
    return state;
  }

  /**
   * Returns the current state of the cube as a string compatible with cubejs.
   *
   * See https://github.com/ldez/cubejs#cubefromstringstr
   */
  get stateString() {
    const cornerFaceIndices = [
      [29, 15, 26],
      [9, 8, 20],
      [6, 38, 18],
      [44, 27, 24],
      [17, 35, 51],
      [2, 11, 45],
      [36, 0, 47],
      [33, 42, 53]
    ];

    const edgeFaceIndices = [
      [25, 28],
      [23, 12],
      [19, 7],
      [21, 41],
      [32, 16],
      [5, 10],
      [3, 37],
      [30, 43],
      [52, 34],
      [48, 14],
      [46, 1],
      [50, 39]
    ];

    const colorFaceMapping = {
      blue: 'B',
      yellow: 'D',
      orange: 'L',
      white: 'U',
      red: 'R',
      green: 'F'
    };

    const state = this.state;
    const faces = [];

    state.corners.forEach((corner, cornerIndex) => {
      corner.position.forEach((face, faceIndex) => {
        faces[cornerFaceIndices[cornerIndex][faceIndex]] = colorFaceMapping[corner.colors[faceIndex]];
      });
    });

    state.edges.forEach((edge, edgeIndex) => {
      edge.position.forEach((face, faceIndex) => {
        faces[edgeFaceIndices[edgeIndex][faceIndex]] = colorFaceMapping[edge.colors[faceIndex]];
      });
    });

    faces[4] = 'U';
    faces[13] = 'R';
    faces[22] = 'F';
    faces[31] = 'D';
    faces[40] = 'L';
    faces[49] = 'B';

    return faces.join('');
  }

  _onCharacteristicValueChanged(event) {

    const value = event.target.value;
    console.log('event handled', value)
    console.log('Str', String(value.buffer))
    console.log('Str', String.fromCharCode.apply(null, new Uint8Array(value.buffer)))
    console.log('toString', value.buffer.toString())
    // const {state, moves} = this._parseCubeValue(value);
    // this._state = state;
    // this.emit('move', moves[0]);
  }

  _parseCubeValue(value) {
    const state = {
      cornerPositions: [],
      cornerOrientations: [],
      edgePositions: [],
      edgeOrientations: []
    };
    const moves = [];
    for (let i = 0; i < value.byteLength; i++) {
      const move = value.getUint8(i);
      const highNibble = move >> 4;
      const lowNibble = move & 0b1111;
      if (i < 4) {
        state.cornerPositions.push(highNibble, lowNibble);
      } else if (i < 8) {
        state.cornerOrientations.push(highNibble, lowNibble);
      } else if (i < 14) {
        state.edgePositions.push(highNibble, lowNibble);
      } else if (i < 16) {
        state.edgeOrientations.push(!!(move & 0b10000000));
        state.edgeOrientations.push(!!(move & 0b01000000));
        state.edgeOrientations.push(!!(move & 0b00100000));
        state.edgeOrientations.push(!!(move & 0b00010000));
        if (i === 14) {
          state.edgeOrientations.push(!!(move & 0b00001000));
          state.edgeOrientations.push(!!(move & 0b00000100));
          state.edgeOrientations.push(!!(move & 0b00000010));
          state.edgeOrientations.push(!!(move & 0b00000001));
        }
      } else {
        moves.push(this._parseMove(highNibble, lowNibble));
      }
    }

    return { state, moves };
  }

  _parseMove(faceIndex, turnIndex) {
    const face = faces[faceIndex - 1];
    const amount = turns[turnIndex - 1];
    let notation = face;

    switch (amount) {
      case 2: notation = `${face}2`; break;
      case -1: notation = `${face}'`; break;
      case -2: notation = `${face}2'`; break;
    }

    return { face, amount, notation };
  }

  _mapCornerColors(colors, orientation, position) {
    const actualColors = [];
    let new_orientation;

    if (orientation !== 3) {
      if (position === 0 || position === 2 || position === 5 || position === 7) {
        new_orientation = 3 - orientation;
      }
    }

    switch (new_orientation) {
      case 1:
        actualColors[0] = colors[1];
        actualColors[1] = colors[2];
        actualColors[2] = colors[0];
        break;
      case 2:
        actualColors[0] = colors[2];
        actualColors[1] = colors[0];
        actualColors[2] = colors[1];
        break;
      case 3:
        actualColors[0] = colors[0];
        actualColors[1] = colors[1];
        actualColors[2] = colors[2];
        break;
    }

    return actualColors;
  }

  _mapEdgeColors(colors, orientation) {
    const actualColors = [...colors];
    if (orientation) {
      actualColors.reverse();
    }
    return actualColors;
  }
}