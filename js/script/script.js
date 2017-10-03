/**
 * Author : Sanghwan Jun
 * Choropleth Mapping grid-based statistics using THREE.js and OpenLayers3
 * reference - https://github.com/GeoForum/veiledning08
 * reference - https://github.com/GeoForum/veiledning09
 */
var bounds = [14338461.150566041, 4164706.698398846, 14394740.200690242, 4216259.435229809]; // Min X, Min Y, Max X, Max Y left, bottom, right, top
boundsWidth = bounds[2] - bounds[0],
boundsHeight = bounds[3] - bounds[1],
cellSize = 1000,
xCells = boundsWidth / cellSize,
yCells = boundsHeight / cellSize,
sceneWidth = 100,
sceneHeight = 100 * (boundsHeight / boundsWidth),
boxSize = sceneWidth / xCells,
valueFactor = 0.0015,
width  = window.innerWidth,
height = window.innerHeight;

var colorScale = d3.scale.threshold()
.domain([0, 1000, 3000, 6000, 9000, 12000, 15000]) // max = 617
.range(['#fff7f3', '#fde0dd', '#fcc5c0', '#fa9fb5', '#f768a1', '#dd3497', '#ae017e', '#7a0177']);

//container
var scene = new THREE.Scene();

//camera 객체 생성
var camera = new THREE.PerspectiveCamera( 20, width / height, 0.1, 1000 );
camera.position.set(0, - 200, 120);
// camera.position.set(0,150,400); 

//객체 렌더링에 그래픽 카드를 사용하기 위해 WebGLRenderer생성
var renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild( renderer.domElement );

// EVENTS
THREEx.WindowResize(renderer, camera);
THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
// CONTROLS
var controls = new THREE.OrbitControls( camera );
// var controls = new THREE.TrackballControls(camera);
// STATS
var stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.bottom = '0px';
stats.domElement.style.zIndex = 100;
document.body.appendChild( stats.domElement );

var geometry = new THREE.PlaneGeometry(sceneWidth, sceneHeight, 1, 1),          
material = new THREE.MeshBasicMaterial(),
plane = new THREE.Mesh(geometry, material);

var textureLoader = new THREE.TextureLoader();
/**
 * 배경지도를 web gis server로 부터 WMS를 통해 jpeg 또는 png로 얻을 수 있다.
 * cross-orgin을 피하기 위해 proxy용 webserver를 활용하거나 chrome의 cross-orgin을 허용하게 해주는 extention을 활용할 수 있다.
 * 본 예제에서는 directory에 저장된 이미지를 활용
 */
var wms = 'http://localhost:8080/geoserver/test_data/wms?service=WMS&version=1.1.0&request=GetMap&layers=test_data:simple_busan&styles=&bbox=1.4337489110349558E7,4165210.927646648,1.4394368766915834E7,4216299.144311736&width=768&height=689&srs=EPSG:3857&format=image%2Fjpeg';
// textureLoader.load(wms, function(texture) {
//     material.map = texture;
//     scene.add(plane);
// });
textureLoader.load('../data/test_data-simple_busan.jpg', function(texture) {
    material.map = texture;
    scene.add(plane);
});

var ambLight = new THREE.AmbientLight(0x777777);
scene.add(ambLight);

var dirLight = new THREE.DirectionalLight(0xcccccc, 1);
dirLight.position.set(-70, -50, 80);
scene.add(dirLight);

//3d로 렌더링 하기 위한 geojson(부산광역시 2012년 범죄현황 데이터를 그리드로 구성한 것입니다.)
var busanCrimeGrid = new ol.source.Vector({
    features: (new ol.format.GeoJSON()).readFeatures(busan_crime_grid)
});

/**
 * grid의 minx, miny, maxx, maxy를 이용해 THREE.js의 cube 생성
 * gird의 중심점에 위치시킨다.
 */
var extent = busanCrimeGrid.getExtent();
busanCrimeGrid.forEachFeatureInExtent(extent, function(feature) {
    //선택된 영역의 polygon의 중심점
    var extentOfFeature = feature.getGeometry().getExtent();
    var centeroid = ol.extent.getCenter(extentOfFeature);

    // var utmX = parseInt(centeroid[0]) - 2000000 + cellSize; // First seven digits minus false easting
    // var utmY = parseInt(centeroid[1]) + cellSize; // Last seven digits
    var sceneX = (extentOfFeature[2] - bounds[0]) / (boundsWidth / sceneWidth) - sceneWidth / 2;
    var sceneY = (extentOfFeature[3] - bounds[1]) / (boundsHeight / sceneHeight) - sceneHeight / 2;

    var value = parseInt(feature.getProperties().DV);
    // var geometry = new THREE.BoxGeometry(boxSize, boxSize, value * valueFactor);
    var geometry = new THREE.BoxGeometry(boxSize, boxSize, value * valueFactor);

    var material = new THREE.MeshPhongMaterial({
        color: colorScale(value)
    });
    var cube = new THREE.Mesh(geometry, material);
    cube.position.set(sceneX, sceneY, value * valueFactor / 2);
    console.log('feature : ', feature);

    var obj = {
        dv: 0,
        pop: 0,
        price: 0,
        cctv: 0
    };
    obj.dv += parseInt(feature.getProperties().DV);
    obj.pop += parseInt(feature.getProperties().V8);
    obj.price += parseInt(feature.getProperties().V9);
    obj.cctv += parseInt(feature.getProperties().V3);
    cube.data = obj;
    scene.add(cube);
});

//화면에 임시로 선택된 feature들의 데이터를 표출하기 위한 함수
function showData (obj) {
    console.log(obj);
    var r2 = 0.72;
    var adjR2 = 0.59;
    var localR2 = {
        min: 0.32193,
        max: 0.760027,
        avg: 0.55
    };
    var addHtml = '<li> 독립변수 : ' + (obj.dv/1000).toFixed(2) + '</li>'
                + '<li> 인구밀도 : ' + (obj.pop).toFixed(2) + '</li>'
                + '<li> 부동산가격 : ' + (obj.price).toFixed(2) + '</li>'
                + '<li> cctv수 : ' + (obj.cctv).toFixed(2) + '</li>'
                + '<li> R2 : ' + r2 + '</li>'
                + '<li> AdjR2 : ' + adjR2 + '</li>'
                + '<li> LocalR2 최소 : ' + localR2.min + '</li>'
                + '<li> LocalR2 최대 : ' + localR2.max + '</li>'
                + '<li> LocalR2 평균 : ' + localR2.avg + '</li>';

    $('#data').html(addHtml);
}

/**
 *  grid 데이터를 wfs를 통해 geojson으로 얻을 수 있다.
 */
// $.ajax('http://localhost:8080/geoserver/wfs', {
//     type: 'GET',
//     data: {
//         service: 'WFS',
//         version: '1.1.0',
//         request: 'GetFeature',
//         typename: 'test_data:busam_crime_grid',
//         srsname: 'EPSG:3857',
//         outputFormat: 'application/json'
//         // bbox: extent.join(',') + ',EPSG:3857'
//     }
// }).done(function(response) {
//     console.log('response : ', response);
//     // Create vector grid from GeoJSON
//     busanCrimeGrid = new ol.source.Vector({
//         features: (new ol.format.GeoJSON()).readFeatures(response)
//     });

//     var extent = busanCrimeGrid.getExtent();
//     busanCrimeGrid.forEachFeatureInExtent(extent, function(feature) {
//         //선택된 영역의 polygon의 중심점
//         var extentOfFeature = feature.getGeometry().getExtent();
//         var centeroid = ol.extent.getCenter(extentOfFeature);
    
//         // var utmX = parseInt(centeroid[0]) - 2000000 + cellSize; // First seven digits minus false easting
//         // var utmY = parseInt(centeroid[1]) + cellSize; // Last seven digits
//         var sceneX = (extentOfFeature[2] - bounds[0]) / (boundsWidth / sceneWidth) - sceneWidth / 2;
//         var sceneY = (extentOfFeature[3] - bounds[1]) / (boundsHeight / sceneHeight) - sceneHeight / 2;
    
//         var value = parseInt(feature.getProperties().DV);
//         // var geometry = new THREE.BoxGeometry(boxSize, boxSize, value * valueFactor);
//         var geometry = new THREE.BoxGeometry(boxSize, boxSize, value * valueFactor);
    
//         var material = new THREE.MeshPhongMaterial({
//             color: colorScale(value)
//         });
//         var cube = new THREE.Mesh(geometry, material);
//         cube.position.set(sceneX, sceneY, value * valueFactor / 2);
//         cube.value = parseInt(feature.getProperties().DV);
//         scene.add(cube);
//     });
// });

var projector = new THREE.Projector();
document.addEventListener( 'mousemove', onDocumentMouseMove, false );


// var canvas = document.createElement('canvas');
// var context = canvas.getContext('2d');
// context.font = "Bold 20px Arial";
// context.fillStyle = "rgba(0,0,0,0.95)";
// var texture = new THREE.Texture(canvas) 
// texture.needsUpdate = true;
// var spriteAlignment = new THREE.Vector2( 1, -1 ); 
// var spriteMaterial = new THREE.SpriteMaterial( { map: texture, useScreenCoordinates: true, alignment: spriteAlignment } );

// var sprite = new THREE.Sprite( spriteMaterial );
// // sprite.scale.set(200,100,0.25);
// sprite.scale.set(50,30,0.25);
// sprite.position.set( -60, 60, 0 );
// scene.add(sprite);
var INTERSECTED;
var mouse = {x: 0, y: 0};
function onDocumentMouseMove(event){
    // console.log(event);
	// sprite.position.set(event.clientX, event.clientY - 20, 0);
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // console.log('sprite.position : ', sprite.position);
    // console.log('mouse :', mouse);
}

function update(){
    /**
     * find intersections coord
     * create a Ray with orgin at the mouse position
     * and direction into the scene(camera direction)
     */
    var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
    projector.unprojectVector( vector, camera );
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

    //create an array containing all objects in the scene with the ray intersects
    var intersects = ray.intersectObjects(scene.children);
    // console.log(intersects);
    if(intersects.length > 0){
        if(intersects[0].object != INTERSECTED){
            if(INTERSECTED){
                INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
			}
            if(intersects[0].object.data){
                INTERSECTED = intersects[0].object;
                INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
                INTERSECTED.material.color.setHex(0xffff00);
                // context.clearRect(0,0,50,30);
				// var message = intersects[0].object.id;
				// var metrics = context.measureText(message);
				// var width = metrics.width;
				// context.fillStyle = "rgba(0,0,0,0.95)"; // black border
                // context.fillRect( 0,0, width,20+8);
				// context.fillStyle = "rgba(255,255,255,0.95)"; // white filler
				// context.fillRect( 2,2, width+4,20+4 );
				// context.fillStyle = "rgba(0,0,0,1)"; // text color
				// context.fillText( message, 4,20 );
                // texture.needsUpdate = true;
                showData(intersects[0].object.data)
            }else{
                INTERSECTED = null;
                $('#data').html('');
                // context.clearRect(0,0,300,300);
                // texture.needsUpdate = true;
                // context.clearRect(0,0,300,300);
				// texture.needsUpdate = true;
            }
        }
    }else{
        if(INTERSECTED){
            INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        }
        INTERSECTED = null;
        $('#data').html('');
        // context.clearRect(0,0,300,300);
		// texture.needsUpdate = true;
    }
    controls.update();
	stats.update();
}

function render() {
    controls.update();
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    update();
}
render();
