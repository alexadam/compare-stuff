import React from 'react';
import ReactDOM from 'react-dom';
import THREE from './CustomThree';
var OrbitControls = require('three-orbit-controls')(THREE)
import * as ContentUtils from './content-gen'

export default class View3D extends React.Component {
    constructor(props) {
        super(props);
    }

    camera = null;
    renderer = null;
    scene = null;
    controls = null;

    objLeft = null
    objRight = null

    componentDidMount() {
        this.init();
        window.addEventListener('resize', this.applyResize.bind(this), false);
    }

    applyResize() {
        if (!this.camera) {
            return;
        }
        this.camera.aspect = this.renderer.domElement.clientWidth / this.renderer.domElement.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight);
        this.renderer.render(this.scene, this.camera);
    }

    init = () => {
        let component = this;
        let width = ReactDOM.findDOMNode(component).clientWidth;
        let height = ReactDOM.findDOMNode(component).clientHeight;
        let backgroundColor = '#C6D7E1';

        this.scene = new THREE.Scene();

        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
        directionalLight.position.x = 0;
        directionalLight.position.y = 0;
        directionalLight.position.z = 1;
        directionalLight.position.normalize();
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        var light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.25);
        this.scene.add(light);

        light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.25);
        this.scene.add(light);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(backgroundColor, 0);

        //////////
        //////////

        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
        this.camera.position.set(0, 50, 40);
        this.scene.add(this.camera);
        directionalLight.position.copy(this.camera.position);


        this.controls = new OrbitControls(this.camera, ReactDOM.findDOMNode(component), this.renderer);
        this.controls.addEventListener('change', () => {
            directionalLight.position.copy(this.camera.position);
            this.renderer.render(this.scene, this.camera);
        });
        this.controls.maxPolarAngle =  Math.PI/2; // prevent the camera from going under the ground
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 10000;

        ReactDOM.findDOMNode(component).replaceChild(this.renderer.domElement, ReactDOM.findDOMNode(component).firstChild);

        this.renderer.render(this.scene, this.camera);

        //////
        //////

        const marginX = 1
        const marginY = 1

        // this.objLeft = this.createCube(30);
        this.objRight = this.createCube(10);

        // this.objLeft = ContentUtils.genMoneyBrick(100)
        // this.objLeft.position.set(0, 0, 0);
        // this.scene.add(this.objLeft);

        ContentUtils.makeMoneyBrick(100, (moneyMesh) => {
            // this.objLeft = moneyMesh
            // this.objLeft.position.set(0, 0, 0);
            // this.scene.add(this.objLeft);

            let mg = ContentUtils.makeMoneyPile(moneyMesh, 39)
            this.objLeft = mg
            this.objLeft.position.set(0, 0, 0);
            this.scene.add(this.objLeft);

            let bboxLeft = this.getBBox(this.objLeft)
            let bboxRight = this.getBBox(this.objRight)

            this.objLeft.position.set(-(marginX + bboxLeft.getSize().x), 0, marginY)
            this.objRight.position.set(marginX + bboxRight.getSize().x, 0, marginY)

            let sceneBBox = bboxLeft.union(bboxRight)
            this.fitCameraToObject(this.camera, sceneBBox, 1.25, this.controls)

            this.renderer.render(this.scene, this.camera);
        })

        // TODO implement scale factor if sizes are huge


    }

    createCube = (dim = 1) => {
        let mesh = new THREE.Mesh(new THREE.CubeGeometry(dim, dim, dim), new THREE.MeshPhongMaterial({ color: '#007fff'}));
        mesh.position.set(0, 0, 0);
        this.scene.add(mesh);

        return mesh;
    }

    getBBox = (obj) => new THREE.Box3().setFromObject(obj)

    fitCameraToObject = (camera, boundingBox, offset, controls) => {

        offset = offset || 1.25;
        // const boundingBox = new THREE.Box3();
        // // get bounding box of object - this will be used to setup controls and camera
        // boundingBox.setFromObject(object);
        const center = boundingBox.getCenter();
        const size = boundingBox.getSize();

        camera.position.set(0, size.y*5, size.z*5)
        controls.update()

        this.renderer.render(this.scene, this.camera);
    }

    render = () =>  {
        return (
           <div id="Graph3D" style={{width: '100%', height:'100%'}}>
                 <div style={{
                         textAlign: 'center',
                         marginTop: 0
                     }}>
                 </div>
           </div>
       );
    }
}
