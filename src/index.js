const tileSize = [256, 256];

class OSM {
    constructor(cfg) {
        // console.log('OSM constructor');
        this.config = cfg || {};
        this.dragStart = {};
        this.dragging = false;
    }

    setDom(cfg) {
        this.config = Object.assign(this.config, cfg);
    }

    setServer(url) {
        this.config.server = url;
    }

    setConfig(cfg) {
        this.config = Object.assign(this.config, cfg);
    }

    createCanvas(config) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = config.size.width;
        canvas.height = config.size.height;
        config.container.appendChild(canvas);
        const self = this;
        canvas.addEventListener('mousedown', function(event) {
            self.dragStart = {
                x: event.pageX - canvas.offsetLeft,
                y: event.pageY - canvas.offsetTop
            }
            self.dragging = true;
        });
        canvas.addEventListener('mouseup', function(event) {
            self.dragging = false;
        });
        canvas.addEventListener('mousewheel', function(event) {
            if (event.deltaY > 0 && self.config.zoom < 18) {
                self.config.zoom++;
            }
            else if (event.deltaY < 0 && self.config.zoom > 0) {
                self.config.zoom--;
            }
            console.log('zoom:', self.config.zoom);
            self.update();
        });
        canvas.addEventListener('mousemove', function(event) {
            if (self.dragging) {
                const dragEnd = {
                    x: event.pageX - canvas.offsetLeft,
                    y: event.pageY - canvas.offsetTop
                }
                const dragOffset = {
                    x: dragEnd.x - self.dragStart.x,
                    y: dragEnd.y - self.dragStart.y
                }
                self.dragStart = dragEnd;
                // console.log(dragOffset);
                const zoom = self.config.zoom;
                const mercator = self.lonlat2Mercator(self.config.center, zoom);
                const mercatorOffset = {
                    x: mercator.x - dragOffset.x / tileSize[0],
                    y: mercator.y - dragOffset.y / tileSize[1]
                };
                self.config.center = self.mercator2Lonlat(mercatorOffset, zoom);
                console.log('center:', self.config.center);
                self.update();
            }
        });
        return context;
    }

    lonlat2Mercator(lonlat, zoom) {
        const lambdaY = lat => Math.log(Math.tan((90 + lat) * Math.PI / 360));
        return {
            x: (180 + lonlat.lon) / 360 * Math.pow(2, zoom),
            y: (lambdaY(85.05112) - lambdaY(lonlat.lat)) / (lambdaY(85.05112) * 2 / Math.pow(2, zoom))
        }
    }

    mercator2Lonlat(mercator, zoom) {
        const lambdaLat = y => Math.atan(Math.exp(y)) * 360 / Math.PI - 90;
        const lambdaY = lat => Math.log(Math.tan((90 + lat) * Math.PI / 360));
        const lambdaY85 = lambdaY(85.05112);
        return {
            lon: (mercator.x / Math.pow(2, zoom) * 360) - 180,
            lat: lambdaLat(lambdaY85 - mercator.y * lambdaY85 * 2/ Math.pow(2, zoom))
        }
    }

    calcCenterXYZ(center, zoom) {
        const mercator = this.lonlat2Mercator(center, zoom);
        return {x: mercator.x, y: mercator.y, z: zoom};
    }

    calcBoundXY(centerXYZ, size) {
        const tileNumHalf = [size.width / tileSize[0] / 2, size.height / tileSize[1] / 2];
        let boundX = [Math.floor(centerXYZ.x - tileNumHalf[0]), Math.ceil(centerXYZ.x + tileNumHalf[0])];
        let boundY = [Math.floor(centerXYZ.y - tileNumHalf[1]), Math.ceil(centerXYZ.y + tileNumHalf[1])];
        const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
        boundX = boundX.map(v => clamp(v, 0, Math.pow(2, centerXYZ.z)));
        boundY = boundY.map(v => clamp(v, 0, Math.pow(2, centerXYZ.z)));
        const origin = [Math.floor(size.width / 2 - (centerXYZ.x - boundX[0]) * tileSize[0]), 
                        Math.floor(size.height / 2 - (centerXYZ.y - boundY[0]) * tileSize[1])];
        return {boundX, boundY, origin};
    }

    genTileList(server, z, boundXY) {
        let list = [];
        for(let y = boundXY.boundY[0]; y < boundXY.boundY[1]; ++y) {
            for(let x = boundXY.boundX[0]; x < boundXY.boundX[1]; ++x) {
                const url = this.genURL(server, x, y, z);
                const pos = [x - boundXY.boundX[0], y - boundXY.boundY[0]];
                const index = [x, y, z];
                list.push({url, pos, index});
            }
        }
        return list;
    }

    genURL(server, x, y, z) {
        return server
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y));
    }

    getTile(context, origin, tileList, size) {
        // context.fillStyle = '#EBEBEB';
        // context.fillRect(0, 0, size.width, size.height);
        for(let tile of tileList) {
            let img = new Image;
            img.src = tile.url;
            img.onload = () => {
                context.drawImage(img, tile.pos[0] * tileSize[0] + origin[0], tile.pos[1] * tileSize[1] + origin[1]);
            };
        }
    }

    render() {
        this.context = this.createCanvas(this.config);
        this.update();
    }

    update() {
        const centerXYZ = this.calcCenterXYZ(this.config.center, this.config.zoom);
        const boundXY = this.calcBoundXY(centerXYZ, this.config.size);
        const tileList = this.genTileList(this.config.server, centerXYZ.z, boundXY);
        this.getTile(this.context, boundXY.origin, tileList, this.config.size);
    }
}

module.exports = OSM;