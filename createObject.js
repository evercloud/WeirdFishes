import * as THREE from '../build/three.module.js';


export function addTestCubeToScene(sizeX, sizeY, sizeZ, positionX, positionY, positionZ, materialRef, sceneRef) {
    const cubeMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(sizeX, sizeY, sizeZ), materialRef);

    if (positionX)
        cubeMesh.position.x = positionX;
    if (positionY)
        cubeMesh.position.y = positionY;
    if (positionZ)
        cubeMesh.position.z = positionZ;

    sceneRef.add(cubeMesh);

    return cubeMesh; //return it for further modifications
}
