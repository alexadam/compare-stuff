import React from 'react';
import ReactDOM from 'react-dom';
// import * as THREE from 'three';
import THREE from './engine/CustomThree';
var OrbitControls = require('three-orbit-controls')(THREE)

import * as Primitives from './engine/utils/primitives'
import * as Loaders from './engine/utils/Loaders'
import * as Utils from './engine/utils/utils'
import * as TestData from './test-data'

import './view3d.scss'

export default class View3D extends React.Component {
    constructor(props) {
        super(props);
    }

    camerea = null;
    renderer = null;
    scene = null;
    scene2 = null;
    controls = null;

    ///////////////////////

    primitiveMeshes = {}
    allObjects = [];
    allLabels = [];
    selectedObject = null;
    selectionIndicator = null;
    clickOrMoveTimer = null; // FIXME
    mouseMoved = false;
    isMouseButtonDown = false;

    shouldUpdate = false;

    /////////////////////////

    componentDidMount = () => {
        window.addEventListener('resize', this.applyResize.bind(this), false);
        this.addMouseListeners();
        this.init();
    }

    shouldComponentUpdate = () => this.shouldUpdate

    componentWillReceiveProps = (nextProps) => {
        if (nextProps.shouldUpdate) {
            this.shouldUpdate = nextProps.shouldUpdate
        }
    }

    // TODO remove - delay ????
    // render = () => {
    //     this.renderer.render(this.scene, this.camera);
    // }

    applyResize = () => {
        if (!this.camera) {
            return;
        }
        let width = ReactDOM.findDOMNode(this).clientWidth;
        let height = ReactDOM.findDOMNode(this).clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.render(this.scene, this.camera);
    }

    addMouseListeners = () => {
        let DOMNode = ReactDOM.findDOMNode(this);

        DOMNode.addEventListener('mousedown', (event) => {
            this.onMouseDown(event);
        });
        DOMNode.addEventListener('mousemove', (event) => {
            this.onMouseMove(event);
        });
        DOMNode.addEventListener('mouseup', (event) => {
            this.onMouseUp(event);
        });
        DOMNode.addEventListener('wheel', (event) => {
            this.onMouseWheel(event);
        });

        DOMNode.addEventListener('touchstart', (event) => {
            this.onMouseDown(event);
        });
        DOMNode.addEventListener('touchmove', (event) => {
            this.onMouseMove(event);
        });
        DOMNode.addEventListener('touchend', (event) => {
            this.onMouseUp(event);
        });
        DOMNode.addEventListener('touchcancel', (event) => {
            this.onMouseUp(event);
        });
    }

    onMouseDown = (event) => {
        // return
        event.preventDefault();

        this.isMouseButtonDown = true

        let clientX = event.clientX;
        let clientY = event.clientY;

        if (event.touches && event.touches[0]) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }

        let renderBB = this.renderer.domElement.getBoundingClientRect();
        let x = ((clientX - renderBB.left) / (renderBB.width - renderBB.left)) * 2 - 1;
        let y = -((clientY - renderBB.top) / (renderBB.bottom - renderBB.top)) * 2 + 1;
        let mxz = Primitives.mouseToXZ(x, y, this.camera);

        //////////

        this.clickOrMoveTimer = setTimeout(this.detectIntersection.bind(this, x, y, event), 100)
    }

    onMouseMove = (event) => {
        if (this.isMouseButtonDown) {
            this.cameraChanged2.push(true)
            if (this.clickOrMoveTimer && this.cameraChanged2.length >= 3) {
                clearTimeout(this.clickOrMoveTimer)
                this.clickOrMoveTimer = null;
            }
            this.mouseMoved = true
        }
    }
    onMouseUp = (event) => {
        this.cameraChanged2 = []
        this.isMouseButtonDown = false
        this.mouseMoved = false
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }
    }
    onMouseWheel = (event) => {}




    /////////////////////////////////
    /////////////////////////////////
    /////////////////////////////////


    detectIntersection = (x, y, event) => {
        let tmpSelectedObject = Primitives.getIntersectedObject(x, y, this.allObjects, this.camera);
        if (tmpSelectedObject) {
            this.scene.remove(this.selectionIndicator)
            this.selectedObject = tmpSelectedObject;
            let highlightColor = 0x00ff00;

            console.log("selectedObject", this.selectedObject);

            if (!this.selectedObject.geometry) {
                this.selectionIndicator = new THREE.BoxHelper(this.selectedObject, highlightColor);
                let material = new THREE.LineDashedMaterial( {
                	color: highlightColor,
                	linewidth: 2,
                	scale: 1,
                	dashSize: 3,
                	gapSize: 1,
                    transparent: true,
                    opacity: 1
                } );
            } else {
                var edges = new THREE.EdgesGeometry( this.selectedObject.geometry );
                this.selectionIndicator = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: highlightColor, linewidth: 2 } ) );
                this.selectionIndicator.position.set(this.selectedObject.position.x, this.selectedObject.position.y, this.selectedObject.position.z)
            }

            this.scene.add(this.selectionIndicator);
            this.renderer.render(this.scene, this.camera);

            let screenPos = Primitives.toScreenXY(this.selectedObject.position, this.camera, this.renderer.domElement);
            console.log('screenPso', screenPos);
            this.props.onSceneMove(screenPos)

            console.log('mouse button', Primitives.getMouseButton(event));

            // TODO
            // this.fitCameraToObject(this.selectedObject)
        }
    }


    /////////////////////////////


    timer = null
    cameraChanged = false
    cameraChanged2 = []

    init = () => {
        let component = ReactDOM.findDOMNode(this);
        let width = component.clientWidth;
        let height = component.clientHeight;
        // let sceneBackgroundColor = 0xC6D7E1;
        // let sceneBackgroundColor = 0x8C8C8C;
        // let sceneBackgroundColor = 0x5C6771;
        // let sceneBackgroundColor = 0xB1B0B4;
        // let sceneBackgroundColor = 0xABAFB4;
        // let sceneBackgroundColor = 0x2B3134;
        // let sceneBackgroundColor = 0x979797;
        let sceneBackgroundColor = 0x767D85;
        // let sceneBackgroundColor = 0xEBECE4;
        // let sceneBackgroundColor = 0xB9BABC;
        // let sceneBackgroundColor = 0x232323;
        let rendererBackgroundColor = 0xC6D7E1;

        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(sceneBackgroundColor);
        this.scene2 = new THREE.Scene();
        // this.scene2.background = new THREE.Color(sceneBackgroundColor);

        var light = new THREE.HemisphereLight(0xffffff, 0x888888, 1.1);
        light.position.set(0, 2.5, 0);
        this.scene.add(light);
        this.scene2.add(light.clone());

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            precision: "lowp"
        });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0xffffff, 0);

        //////////
        //////////

        this.camera = new THREE.PerspectiveCamera(55, width / height, 1, 10000);
        this.camera.position.set(10, 10, 10);
        this.scene.add(this.camera);
        this.scene2.add(this.camera);

        this.controls = new OrbitControls(this.camera, component, this.renderer);
        this.controls.maxPolarAngle =  Math.PI/2; // prevent the camera from going under the ground
        this.controls.minDistance = 0.01;
        this.controls.maxDistance = 1000;
        this.controls.target = new THREE.Vector3(10, -5,-10)
        this.controls.update()

        this.controls.addEventListener('start', (event) => {
            this.timer = setTimeout(()=>{
                if (this.cameraChanged2.length < 3) {
                    return
                }
                this.props.onSceneMove({x:0, y:0})
                this.renderer.render(this.scene2, this.camera);
            }, 100)
        });
        this.controls.addEventListener('change', () => {
            this.renderer.render(this.scene2, this.camera);
        });
        this.controls.addEventListener('end', () => {
            // for (let label of this.allLabels) {
            //    label.rotation.copy(this.camera.rotation);
            // }
            // let scaleVector = new THREE.Vector3();
            // let scaleFactor = 17;
            // for (let indicator of this.allLabels) {
            //     let scale = scaleVector.subVectors(indicator.position, this.camera.position).length() / scaleFactor;
            //     indicator.scale.set(scale, scale, 1);
            // }

            ////////
            if (this.selectedObject) {
                let screenPos = Primitives.toScreenXY(this.selectedObject.position, this.camera, this.renderer.domElement);
                this.props.onSceneMove(screenPos)
            }

            this.renderer.render(this.scene, this.camera)
        });

        component.replaceChild(this.renderer.domElement, component.firstChild);



         /// TODO remove

        // this.load3DObjects();
        //
        //

        let nrOfFloors = 0
        let moreFloors = []
        for (let i = 0; i < nrOfFloors; i++) {
            moreFloors.push(TestData.getFloorData(i*3))
        }

        TestData.officeModelData2.model.parts = TestData.officeModelData2.model.parts.concat(moreFloors)
        let testResult = TestData.prepareDataModel(TestData.officeModelData2.model)

        this.loadPrimitiveMeshes(TestData.officeModelData2.primitives, () => {

            let index =  0;
            for (let res of testResult) {
                if (index++ % 500 === 0) {
                    console.log('res................'+ index);
                }
                let primitive = this.primitiveMeshes[res.geometry]
                //
                if (primitive instanceof THREE.Group) { //} && (res.absPosition.y < 30 || res.absPosition.y > 33)) {
                //     let bbox = Primitives.getBoundingBox(primitive.children[0]);
                //     let cube = Primitives.createCube3D(bbox.x, bbox.y, bbox.z);
                //     let position = new THREE.Vector3();
                //     // position.setMatrixFromPosition( primitive.matrix );
                //     // console.log("MMATRIXXXXXX", position);
                //     // cube.matrix.clone(primitive.matrix)
                //     // cube.matrixWorld.clone(primitive.matrixWorld)
                //     cube.rotation.set(res.rotation.x, res.rotation.y, res.rotation.z)
                //     cube.position.set(primitive.position.x+ res.absPosition.x, primitive.position.y + res.absPosition.y, primitive.position.z+res.absPosition.z)
                //     // cube.position.set(res.absPosition.x, res.absPosition.y, res.absPosition.z)
                //     this.allObjects.push(cube);
                //     this.scene.add(cube)
                }
                // else {
                    let tmpMesh = primitive.clone()
                    tmpMesh.rotation.set(res.rotation.x, res.rotation.y, res.rotation.z)
                    tmpMesh.position.set(res.absPosition.x, res.absPosition.y, res.absPosition.z)
                    tmpMesh.userData = {...primitive.userData, ...res}

                    // FIXME - only include floors and rooms maybe ??
                    if (!(tmpMesh instanceof THREE.Group)) {
                        this.scene2.add(tmpMesh.clone())
                    }

                    if (res.opacity) {
                        if (tmpMesh instanceof THREE.Group) {
                            for (let child of tmpMesh.children) {
                                if (child.material instanceof Array) {
                                    child.material = child.material.map((m)=>m.clone())
                                    for (let m of child.material) {
                                        m.transparent = true
                                        m.opacity = 0.5; //res.opacity
                                        // m.overdraw = true; //res.opacity
                                        // m.alphaTest =  0.5
                                        m.needsUpdate = true
                                    }
                                }
                            }
                        }
                    }

                    this.allObjects.push(tmpMesh);
                    this.scene.add(tmpMesh)
                // }

            }

            // this.createLabel({x: 3, y: 2, z: 1}, {text: '1'});
            // this.createLabel({x: 10.25, y: 0.9, z: -2.7}, {text: '+'});
            // this.createLabel({x: 10.25, y: 0.9, z: -1.9}, {text: '+'});
            // this.createLabel({x: 10.25, y: 0.9, z: -1}, {text: '+'});
            // this.createLabel({x: 11, y: 1, z: -2.7}, {text: '+'});
            // this.createLabel({x: 11, y: 1, z: -1.9}, {text: '+'});
            // this.createLabel({x: 11, y: 1, z: -1}, {text: '+'});
            //
            // this.createLabel({x: 10.5, y: 0.25, z: -3.9}, {text: '->'});

            this.renderer.render(this.scene2, this.camera);
            this.renderer.render(this.scene, this.camera);

        })

        this.renderer.render(this.scene, this.camera);
    }

    randomDrawCube = () => {
        let cube = Primitives.createCube(3);
        cube.position.set(10, 30 * Math.random(), 10)
        cube.material.color.set(Utils.generateRandomColor())

        this.scene3.add(cube)

        this.renderer.render(this.scene, this.camera);
        setTimeout(this.randomDrawCube, 1000)
    }

    mergeGroup = (group) => {
        // let newGeom = new THREE.BufferGeometry()
        let newGeom = new THREE.Geometry()
        let materials = []
        for (let child of group.children) {
            materials.push(child.material)
            var geometry = new THREE.Geometry().fromBufferGeometry(child.geometry);
            newGeom.merge(geometry, geometry.matrix, materials.length-1)
            // newGeom.merge(child.geometry)
        }
        // newGeom.applyMatrix(group.matrixWorld)
        newGeom.computeFaceNormals();
        // let newMesh = new THREE.Mesh(newGeom, new THREE.MeshLambertMaterial())
        let newMesh = new THREE.Mesh(newGeom, new THREE.MeshLambertMaterial(materials))
        return newMesh;
    }

    loadPrimitiveMeshes = (primitiveObj, onDone) => {
        let allRemotePrimitives = [];
        let allTexturePrimitives = [];

        let index = 0
        for (let primitive of primitiveObj) {
            let pGeom = primitive.geometry;
            if (pGeom.file) {
                allRemotePrimitives.push(primitive)
            } else {
                if (pGeom.type) {
                    let geomType = pGeom.type;
                    let tmpMesh = null;

                    if (geomType === 'extrude') {
                        tmpMesh = Primitives.createExtrudeMesh(pGeom.amount, pGeom.points)
                    } else if (geomType === 'cube') {
                        tmpMesh = Primitives.createCube3D(pGeom.dimensions[0], pGeom.dimensions[1], pGeom.dimensions[2])
                    }

                    if (!tmpMesh) continue;

                    //  NOTE - experiment to see where the center of mesh is
                    // if (index === 0) {
                    //     let box = new THREE.Box3().setFromObject(tmpMesh)
                    //     let sphere = box.getBoundingSphere()
                    //     let centerPoint = sphere.center
                    //
                    //     // var geometry = tmpMesh.geometry;
                    //     // geometry.computeBoundingBox();
                    //     // centerPoint = geometry.boundingBox.getCenter();
                    //     // tmpMesh.localToWorld( centerPoint );
                    //
                    //     centerPoint = new THREE.Vector3();
                    //     for ( var i = 0, l = tmpMesh.geometry.vertices.length; i < l; i ++ ) {
                    //         // console.log(tmpMesh.geometry.vertices[ i ]);
                    //         centerPoint.add( tmpMesh.geometry.vertices[ i ] );
                    //     }
                    //
                    //     centerPoint.divideScalar(tmpMesh.geometry.vertices.length );
                    //     console.log('centerPoint', centerPoint);
                    //
                    //     let kube = Primitives.createCube3D(1,5,1)
                    //     kube.position.set(centerPoint.x, centerPoint.y, centerPoint.z)
                    //     this.scene2.add(kube)
                    //     this.scene.add(kube)
                    //     index++
                    // }

                    tmpMesh.userData = primitive;
                    if (tmpMesh.userData.geometry.scale) {
                        tmpMesh.scale.set(...tmpMesh.userData.geometry.scale)
                    }
                    if (tmpMesh.userData.geometry.texture) {
                        allTexturePrimitives.push(tmpMesh);
                    }
                    if (tmpMesh.userData.geometry.color) {
                        tmpMesh.material.color.set(tmpMesh.userData.geometry.color)
                    }
                    this.primitiveMeshes[primitive.name] = tmpMesh;
                }
            }
        }

        Loaders.loadAllResources(allRemotePrimitives, (objs) => {
            for (let tmpMesh of objs) {
                if (!tmpMesh) continue
                if (tmpMesh.userData.geometry.scale) {
                    tmpMesh.scale.set(...tmpMesh.userData.geometry.scale)
                }
                if (tmpMesh.userData.geometry.texture) {
                    allTexturePrimitives.push(tmpMesh);
                }
                // let gMesh = this.mergeGroup(tmpMesh)
                // this.primitiveMeshes[tmpMesh.userData.name] = gMesh;
                //
                // if (tmpMesh instanceof THREE.Group) {
                //     for (let c of tmpMesh.children) {
                //         c.material.shading = THREE.FlatShading
                //     }
                // }
                this.primitiveMeshes[tmpMesh.userData.name] = tmpMesh;
            }

            if (allTexturePrimitives.length > 0) {
                Loaders.loadAllTextureImages(allTexturePrimitives, (objs) => {
                    onDone();
                })
            } else {
                onDone();
            }

        });
    }

    //////

    /**
     * [createLabel description]
     * @param  {[type]} position   [description]
     * @param  {[type]} properties [description]
     * @return {[type]}            [description]

     properoties examples

     {
        width: 0.5,
        height: 0.5,
        backgroundColor: "black",
        text: "1",
        textColor: "white",
        textSize: 240
    }

     */
    createLabel = (position, properties) => {
        let defaultProperties = {
               width: 0.3,
               height: 0.3,
               backgroundColor: "rgba(0,0,0,1)",
               text: "1",
               textColor: "rgba(255,255,255,1)",
               textSize: 240,
               marginTop: 200,
               marginLeft: 80
           }
        properties = {...defaultProperties, ...properties}

        let imgWidth = 256;
        let imgHeight = 256;
        let mapCanvas = document.createElement('canvas');
        mapCanvas.width = mapCanvas.height = imgWidth;
        let ctx = mapCanvas.getContext('2d');

        // ctx.shadowColor = 'rgba(0,0,0,0.5)';
        // ctx.shadowOffsetX = 0;
        // ctx.shadowOffsetY = 0;
        // ctx.shadowBlur = 30;
        ctx.fillStyle = properties.backgroundColor;
        let factor = 0
        ctx.fillRect(factor, factor, imgWidth - 2 * factor, imgHeight - 2 * factor);

        // ctx.fillStyle = properties.textColor;
        // ctx.font = properties.textSize + "px Arial";
        // rgba(255,255,255,1)
        // ctx.textAlign = "center";
        // ctx.textBaseline = "middle";
        // ctx.fillText(properties.text, properties.marginLeft, properties.marginTop);

        ctx.fillStyle = 'white';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = properties.textSize + "px Arial";
        ctx.fillText(properties.text, mapCanvas.width / 2, mapCanvas.height / 2);

        let texture = new THREE.Texture(mapCanvas);
        texture.needsUpdate = true;
        let mesh2 = new THREE.Mesh(new THREE.CubeGeometry(properties.width, properties.height, properties.height), new THREE.MeshBasicMaterial({
                map: texture,
                // alphaTest: 0.5,
                // transparent: true,
                // depthTest: false,
                // depthWrite: false,
                // doubleSided: true,
                // overdraw: true
            }));
        mesh2.position.set(position.x, position.y, position.z);
        // mesh2.rotation.copy(this.camera.rotation);
        mesh2.userData = {type: 'label'}

        // mesh2.onPlayerClick = this.props.onPlayerClick.bind(null, playerData);

        this.allLabels.push(mesh2);
        this.scene.add(mesh2);
    }

    createLabelWithImage = () => {
        let createMeshThenRender = () => {
           let imgWidth = 256;
           let imgHeight = imgWidth;
           let imgStartX = 0;
           let marginTShirt = 32;
           let tShirtDim = imgWidth - marginTShirt;
           let textHeight = imgHeight - tShirtDim;
           let tShirtNrDim = 75;
           let tShirtNrStartX = imgWidth - tShirtNrDim;
           let tShirtNrStartY = imgHeight - textHeight - tShirtNrDim;
           let tShirtNrFontSize = 60;
           let playerNameFontSize = 30;
           let tShirtNrLeftPadding = playerData.tShirtNr > 9 ? 5 : 20;

           if (!isHomeTeam) {
               imgStartX = marginTShirt;
               tShirtNrStartX = 0;
           }

           let mapCanvas = document.createElement('canvas');
           mapCanvas.width = mapCanvas.height = imgWidth;
           let ctx = mapCanvas.getContext('2d');

           ctx.fillStyle='rgba(255,255,255,0)';
           ctx.fillRect(imgStartX, 0, imgWidth, imgHeight);

           ctx.fillStyle = 'rgba(0,0,0,0)';
           ctx.shadowColor = '#000';
           ctx.shadowOffsetY = 10;
           ctx.shadowBlur = 30;
           ctx.drawImage(img, imgStartX, 0, tShirtDim, tShirtDim);

           ctx.shadowColor = 'rgba(0,0,0,0)';

           // player name
           ctx.fillStyle='rgba(0,0,0,1)';
           ctx.fillRect(0, tShirtDim, imgWidth, textHeight);

           ctx.fillStyle = 'white';
           ctx.font = playerNameFontSize + 'px Arial';
           ctx.fillText(playerData.name, 5, tShirtDim + textHeight/2 + 10);

           // tshirt number
           ctx.fillStyle ='rgba(255,255,255,0.75)';
           ctx.fillRect(tShirtNrStartX, tShirtNrStartY, tShirtNrDim, tShirtNrDim);

           ctx.fillStyle = 'black';
           ctx.font = tShirtNrFontSize + "px Arial";
           ctx.fillText(playerData.tShirtNr, tShirtNrStartX + tShirtNrLeftPadding, tShirtNrStartY + tShirtNrFontSize);

           let texture = new THREE.Texture(mapCanvas);
           texture.needsUpdate = true;
           let mesh2 = new THREE.Mesh(new THREE.CubeGeometry(8, 8, 0), new THREE.MeshBasicMaterial({ color: '#fff', transparent:true, map: texture }));
           mesh2.position.set(x, 5, y);
           this.scene.add(mesh2);

           mesh2.onPlayerClick = this.props.onPlayerClick.bind(null, playerData);

           this.shirts.push(mesh2);
           mesh2.rotation.copy(this.camera.rotation);
           this.renderer.render(this.scene, this.camera);
       }

       let img = new Image();
       img.onload = createMeshThenRender;
       img.src = playerData.tShirtImgUrl;
    }


    loadIndicator = (indicator) => {
        let createMeshThenRender = () => {
          let imgWidth = 256;
          let imgHeight = imgWidth;
          let imgStartX = 0;
          let marginTShirt = 16;
          let tShirtDim = imgWidth - marginTShirt;
          let textHeight = imgHeight - tShirtDim;
          let tShirtNrDim = 200;
          let tShirtNrStartX = imgWidth - tShirtNrDim;
          let tShirtNrStartY = imgHeight - textHeight - tShirtNrDim;
          let tShirtNrFontSize = 180;
          let playerNameFontSize = 30;
          let tShirtNrLeftPadding = 30;

          let mapCanvas = document.createElement('canvas');
          mapCanvas.width = mapCanvas.height = imgWidth;
          let ctx = mapCanvas.getContext('2d');

          ctx.fillStyle = indicator.color;
          ctx.fillRect(0, 0, imgWidth, imgHeight);

          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.drawImage(img, marginTShirt, marginTShirt, tShirtDim - marginTShirt, tShirtDim - marginTShirt);

          let texture = new THREE.Texture(mapCanvas);
          texture.needsUpdate = true;
          let mesh2 = new THREE.Mesh(new THREE.CubeGeometry(0.1, 0.1, 0), new THREE.MeshBasicMaterial({
              color: '#fff',
              transparent: true,
              map: texture,
              depthTest: false,
              polygonOffset: true,
              polygonOffsetFactor: -0.1,
          }));
          mesh2.position.set(indicator.position.x, indicator.position.y, indicator.position.z);
          mesh2.rotation.copy(this.camera.rotation);

          let scaleVector = new THREE.Vector3();
          let scaleFactor = 17;
          let scale = scaleVector.subVectors(mesh2.position, this.camera.position).length() / scaleFactor;
          mesh2.scale.set(scale, scale, 1);
          mesh2.renderOrder = 0.1;

          mesh2.userData = {
            type: 'indicator',
            data: JSON.parse(JSON.stringify(indicator)),
          }

          this.scene.add(mesh2);
          this.allIndicators.push(mesh2);
          this.allObjects.push(mesh2);

          // var material = new THREE.LineBasicMaterial({
          // 	color: 0xffff00,
          //   linewidth: 15
          // });
          //
          // var geometry = new THREE.Geometry();
          // geometry.vertices.push(
          // 	new THREE.Vector3(indicator.position.x, indicator.position.y, indicator.position.z),
          // 	new THREE.Vector3(indicator.position.x, indicator.position.y, indicator.position.z + 4)
          // );
          //
          // var line = new THREE.Line( geometry, material );
          // this.scene.add( line );

          // let dir = new THREE.Vector3(indicator.position.x, indicator.position.y, indicator.position.z);
          // dir.normalize();
          // let origin = new THREE.Vector3(indicator.position.x, indicator.position.y, indicator.position.z+1);
          // let length = 4;
          // let hex = 0xffff00;
          // var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
          // this.scene.add( arrowHelper );
        }

        let img = new Image();
        img.onload = createMeshThenRender;
        img.src = 'http://localhost:8080' + '/assets/icons/' + indicator.icon;
    };


    // use -offset for the opposite angle !!!
    fitCameraToObject = (object, offset = 4) => {
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject( object );
        const center = boundingBox.getCenter();

        let camp = this.camera.position
        let cp = this.controls.target
        // this.controls.position.set(center.x, cp.y, cp.z)

        this.controls.target = new THREE.Vector3(center.x, center.y, center.z)
        // this.controls.lookAt(center)

        this.camera.position.set(center.x + offset, camp.y, center.z + offset)

        this.controls.update()

         this.renderer.render(this.scene2, this.camera);
         this.renderer.render(this.scene, this.camera);
    }
    //////

    clearScene = () => {
         for( let i = this.scene.children.length - 1; i >= 0; i--) {
             let child = this.scene.children[i];
             if (child instanceof THREE.Mesh) {
                 this.scene.remove(child);
             }
         }
    }



    //////////////////////

    render = () =>  {
        return (
           <div className="View3D">
                 <div></div>
           </div>
       );
    }
}
