import THREE from './CustomThree';
import * as Loaders from './FileLoaders'


const dollarSize = {
    x: 15.6,
    y: 0.01,
    z: 6.63,

}

export const makeMoneyBrick = (nrOfBanknotes = 100, onDone) => {

    let loadTexture = () => {
        let imgWidth = 1024;
        let imgHeight = 256;
        let mapCanvas = document.createElement('canvas');
        mapCanvas.width = imgWidth;
        mapCanvas.height = imgHeight;

        let ctx = mapCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        let texture = new THREE.Texture(mapCanvas);
        texture.needsUpdate = true;

        let marginColor = '#B6B49D';
        let bottomColor = '#B6B49D';
        let materials = [
            new THREE.MeshBasicMaterial({
                color: marginColor
            }),
            new THREE.MeshBasicMaterial({
                color: marginColor
            }),
            new THREE.MeshBasicMaterial({
                map: texture
            }),
            new THREE.MeshBasicMaterial({
                color: bottomColor
            }),
            new THREE.MeshBasicMaterial({
                color: marginColor
            }),
            new THREE.MeshBasicMaterial({
                color: marginColor
            }),
        ];

        let money = new THREE.Mesh(new THREE.CubeGeometry(dollarSize.x, nrOfBanknotes * dollarSize.y, dollarSize.z), new THREE.MeshFaceMaterial(materials));
        money.geometry.center();

        onDone(money)
    }

    let img = new Image();
    img.onload = loadTexture;
    img.src = 'http://localhost:8080/assets/textures/100dollars.jpg';
}

const getBBox = (obj) => new THREE.Box3().setFromObject(obj)

export const makeMoneyPile = (moneyBrickMesh, quantity) => {
    let bbox = getBBox(moneyBrickMesh).getSize()
    let cbrt = 1 + Math.floor(Math.cbrt(quantity))
    let moneyGroup = new THREE.Group()

    for (let y = 0; y < cbrt; y++) {
        for (let x = 0; x < cbrt; x++) {
            for (let z = 0; z < cbrt; z++) {
                let index = x * ((cbrt)) + z   + y * cbrt * cbrt
                console.log(index);


                if (index > quantity - 1) {
                    break
                }
                let tmpMoney = moneyBrickMesh.clone()
                tmpMoney.position.set(x * bbox.x, y * bbox.y, z * bbox.z)
                moneyGroup.add(tmpMoney)
            }
        }
    }
    return moneyGroup
}
