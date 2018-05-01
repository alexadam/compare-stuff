import THREE from './CustomThree';


export const loadOBJFile = (objUrl, onLoaded, objLoader = null) => {
    if (!objLoader) {
        objLoader = new THREE.OBJLoader;
    }
    objLoader.load(objUrl, onLoaded);
}

export const loadOBJMTLFile = (objParentPathUrl, objName, onLoaded, onError) => {
    let mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(objParentPathUrl);
    mtlLoader.load(objName + '.mtl', (materials) => {
        materials.preload();
        let objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(objParentPathUrl);
        objLoader.load(objName + '.obj', onLoaded, (progress) => {}, onError);
    }, (progress) => {}, onError);
}

export const load3DSFile = (objParentPathUrl, objName, onLoaded) => {
    // let loader = new THREE.TextureLoader();
    // let normal = loader.load(objParentPathUrl);

    let loader = new THREE.TDSLoader();
    loader.setPath(objParentPathUrl);
    loader.load(objParentPathUrl + objName, function(object) {
        // object.traverse(function(child) {
        //     if (child instanceof THREE.Mesh) {
        //         child.material.normalMap = normal;
        //     }
        // });
        onLoaded(object)
    });
}

const loadResource = (resourceData) => new Promise(
    (resolve, reject) => {
        try {
            let resourceName = resourceData.geometry.file
            let url = resourceData.geometry.url
            if (!url) url = resourceName

            let location = window.location.href

            loadOBJMTLFile(location + 'assets/models/' + url + '/', resourceName,
            // loadOBJMTLFile('http://localhost:8080/assets/3dmodels/' + url + '/', resourceName,
            // loadOBJMTLFile('http://172.22.140.167:8080/assets/3dmodels/' + url + '/', resourceName,
                            (obj) => {
                                obj.userData = resourceData
                                resolve(obj)
                            },
                            (err) => resolve(null))
        } catch (e) {
            resolve(null)
        }
    }
)


export const loadAllResources = (resourcesList, onLoad) => {
    let result = []
    let allPromises = []

    for (let resource of resourcesList) {
        allPromises.push(loadResource(resource))
    }

    Promise.all(allPromises).then(onLoad).catch((err) => console.log(err))
}


///////////////////////////////////
///////////////////////////////////
///////////////////////////////////
///////////////////////////////////

// export const loadTexture = (textureFileName, mesh, onDone) => {
//     let loader = new THREE.TextureLoader();
//
//     loader.load(
//         'http://localhost:8080/assets/textures/' + textureFileName,
//         (texture) => {
//             texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
//             texture.repeat.set(5, 3)
//
//             let material = new THREE.MeshLambertMaterial({
//                 map: texture,
//              });
//              mesh.material = material
//
//              onDone(mesh)
//         },
//         undefined,
//         function ( err ) {
//             onDone(mesh)
//             console.error( 'An error happened.' );
//         }
//     )
// }

export const loadTextureImage = (resourceData) => new Promise(
    (resolve, reject) => {
        try {
            let loader = new THREE.TextureLoader();
            let location = window.location.href

            loader.load(
                location + 'assets/textures/' + resourceData.userData.geometry.texture,
                // 'http://localhost:8080/assets/textures/' + resourceData.userData.geometry.texture,
                // 'http://172.22.140.167:8080/assets/textures/' + resourceData.userData.geometry.texture,
                (texture) => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    // texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
                    texture.offset.set(0.1, 0);

                    if (resourceData.userData.geometry.repeat === false) {
                        texture.offset.set(0, 0);
                        texture.repeat.set(0.055, 0.12);
                    } else {
                        texture.repeat.set(1, 1);
                    }

                    let material = new THREE.MeshLambertMaterial({
                        map: texture,
                     });

                     let borderColor = 0x000000

                     let materials = [
                         new THREE.MeshLambertMaterial({
                             map: texture,
                             transparent: true,
                             opacity: 1,
                         }),
                         new THREE.MeshLambertMaterial({
                             color: borderColor
                         }),
                         new THREE.MeshLambertMaterial({
                             color: borderColor
                         }),
                         new THREE.MeshLambertMaterial({
                             color: borderColor
                         }),
                         new THREE.MeshLambertMaterial({
                             color: borderColor
                         }),
                         new THREE.MeshLambertMaterial({
                             color: borderColor
                         }),
                     ]
                     resourceData.material = materials

                     resolve(resourceData)
                },
                undefined,
                function (err) {
                    resolve(null)
                    console.error( 'An error happened.' );
                }
            )
        } catch (e) {
            resolve(null)
        }
    }
)


export const loadAllTextureImages = (resourcesList, onLoad) => {
    let result = []
    let allPromises = []

    for (let resource of resourcesList) {
        allPromises.push(loadTextureImage(resource))
    }

    Promise.all(allPromises).then(onLoad).catch((err) => console.log(err))
}
