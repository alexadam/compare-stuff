import * as THREE from 'three';


/////////////////////////////
/// LOADERS
/////////////////////////////

/**
 * Loads a Wavefront .mtl file specifying materials
 *
 * @author angelxuanchang
 */
THREE.MTLLoader = function(manager) {
    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
};
THREE.MTLLoader.prototype = {
    constructor: THREE.MTLLoader,
    /**
     * Loads and parses a MTL asset from a URL.
     *
     * @param {String} url - URL to the MTL file.
     * @param {Function} [onLoad] - Callback invoked with the loaded object.
     * @param {Function} [onProgress] - Callback for download progress.
     * @param {Function} [onError] - Callback for download errors.
     *
     * @see setPath setTexturePath
     *
     * @note In order for relative texture references to resolve correctly
     * you must call setPath and/or setTexturePath explicitly prior to load.
     */
    load: function(url, onLoad, onProgress, onError) {
        var scope = this;
        var loader = new THREE.FileLoader(this.manager);
        loader.setPath(this.path);
        loader.load(url, function(text) {
            onLoad(scope.parse(text));
        }, onProgress, onError);
    },
    /**
     * Set base path for resolving references.
     * If set this path will be prepended to each loaded and found reference.
     *
     * @see setTexturePath
     * @param {String} path
     *
     * @example
     *     mtlLoader.setPath( 'assets/obj/' );
     *     mtlLoader.load( 'my.mtl', ... );
     */
    setPath: function(path) {
        this.path = path;
    },
    /**
     * Set base path for resolving texture references.
     * If set this path will be prepended found texture reference.
     * If not set and setPath is, it will be used as texture base path.
     *
     * @see setPath
     * @param {String} path
     *
     * @example
     *     mtlLoader.setPath( 'assets/obj/' );
     *     mtlLoader.setTexturePath( 'assets/textures/' );
     *     mtlLoader.load( 'my.mtl', ... );
     */
    setTexturePath: function(path) {
        this.texturePath = path;
    },
    setBaseUrl: function(path) {
        console.warn('THREE.MTLLoader: .setBaseUrl() is deprecated. Use .setTexturePath( path ) for texture path or .setPath( path ) for general base path instead.');
        this.setTexturePath(path);
    },
    setCrossOrigin: function(value) {
        this.crossOrigin = value;
    },
    setMaterialOptions: function(value) {
        this.materialOptions = value;
    },
    /**
     * Parses a MTL file.
     *
     * @param {String} text - Content of MTL file
     * @return {THREE.MTLLoader.MaterialCreator}
     *
     * @see setPath setTexturePath
     *
     * @note In order for relative texture references to resolve correctly
     * you must call setPath and/or setTexturePath explicitly prior to parse.
     */
    parse: function(text) {
        var lines = text.split('\n');
        var info = {};
        var delimiter_pattern = /\s+/;
        var materialsInfo = {};
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            line = line.trim();
            if (line.length === 0 || line.charAt(0) === '#') {
                // Blank line or comment ignore
                continue;
            }
            var pos = line.indexOf(' ');
            var key = (pos >= 0) ? line.substring(0, pos) : line;
            key = key.toLowerCase();
            var value = (pos >= 0) ? line.substring(pos + 1) : '';
            value = value.trim();
            if (key === 'newmtl') {
                // New material
                info = {
                    name: value
                };
                materialsInfo[value] = info;
            } else if (info) {
                if (key === 'ka' || key === 'kd' || key === 'ks') {
                    var ss = value.split(delimiter_pattern, 3);
                    info[key] = [parseFloat(ss[0]), parseFloat(ss[1]), parseFloat(ss[2])];
                } else {
                    info[key] = value;
                }
            }
        }
        var materialCreator = new THREE.MTLLoader.MaterialCreator(this.texturePath || this.path, this.materialOptions);
        materialCreator.setCrossOrigin(this.crossOrigin);
        materialCreator.setManager(this.manager);
        materialCreator.setMaterials(materialsInfo);
        return materialCreator;
    }
};
/**
 * Create a new THREE-MTLLoader.MaterialCreator
 * @param baseUrl - Url relative to which textures are loaded
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 * @constructor
 */
THREE.MTLLoader.MaterialCreator = function(baseUrl, options) {
    this.baseUrl = baseUrl || '';
    this.options = options;
    this.materialsInfo = {};
    this.materials = {};
    this.materialsArray = [];
    this.nameLookup = {};
    this.side = (this.options && this.options.side) ? this.options.side : THREE.FrontSide;
    this.wrap = (this.options && this.options.wrap) ? this.options.wrap : THREE.RepeatWrapping;
};
THREE.MTLLoader.MaterialCreator.prototype = {
    constructor: THREE.MTLLoader.MaterialCreator,
    crossOrigin: 'Anonymous',
    setCrossOrigin: function(value) {
        this.crossOrigin = value;
    },
    setManager: function(value) {
        this.manager = value;
    },
    setMaterials: function(materialsInfo) {
        this.materialsInfo = this.convert(materialsInfo);
        this.materials = {};
        this.materialsArray = [];
        this.nameLookup = {};
    },
    convert: function(materialsInfo) {
        if (!this.options) return materialsInfo;
        var converted = {};
        for (var mn in materialsInfo) {
            // Convert materials info into normalized form based on options
            var mat = materialsInfo[mn];
            var covmat = {};
            converted[mn] = covmat;
            for (var prop in mat) {
                var save = true;
                var value = mat[prop];
                var lprop = prop.toLowerCase();
                switch (lprop) {
                    case 'kd':
                    case 'ka':
                    case 'ks':
                        // Diffuse color (color under white light) using RGB values
                        if (this.options && this.options.normalizeRGB) {
                            value = [value[0] / 255, value[1] / 255, value[2] / 255];
                        }
                        if (this.options && this.options.ignoreZeroRGBs) {
                            if (value[0] === 0 && value[1] === 0 && value[2] === 0) {
                                // ignore
                                save = false;
                            }
                        }
                        break;
                    default:
                        break;
                }
                if (save) {
                    covmat[lprop] = value;
                }
            }
        }
        return converted;
    },
    preload: function() {
        for (var mn in this.materialsInfo) {
            this.create(mn);
        }
    },
    getIndex: function(materialName) {
        return this.nameLookup[materialName];
    },
    getAsArray: function() {
        var index = 0;
        for (var mn in this.materialsInfo) {
            this.materialsArray[index] = this.create(mn);
            this.nameLookup[mn] = index;
            index++;
        }
        return this.materialsArray;
    },
    create: function(materialName) {
        if (this.materials[materialName] === undefined) {
            this.createMaterial_(materialName);
        }
        return this.materials[materialName];
    },
    createMaterial_: function(materialName) {
        // Create material
        var scope = this;
        var mat = this.materialsInfo[materialName];
        var params = {
            name: materialName,
            side: this.side
        };
        function resolveURL(baseUrl, url) {
            if (typeof url !== 'string' || url === '')
                return '';
            // Absolute URL
            if (/^https?:\/\//i.test(url)) return url;
            return baseUrl + url;
        }
        function setMapForType(mapType, value) {
            if (params[mapType]) return; // Keep the first encountered texture
            var texParams = scope.getTextureParams(value, params);
            var map = scope.loadTexture(resolveURL(scope.baseUrl, texParams.url));
            map.repeat.copy(texParams.scale);
            map.offset.copy(texParams.offset);
            map.wrapS = scope.wrap;
            map.wrapT = scope.wrap;
            params[mapType] = map;
        }
        for (var prop in mat) {
            var value = mat[prop];
            var n;
            if (value === '') continue;
            switch (prop.toLowerCase()) {
                // Ns is material specular exponent
                case 'kd':
                    // Diffuse color (color under white light) using RGB values
                    params.color = new THREE.Color().fromArray(value);
                    break;
                case 'ks':
                    // Specular color (color when light is reflected from shiny surface) using RGB values
                    params.specular = new THREE.Color().fromArray(value);
                    break;
                case 'map_kd':
                    // Diffuse texture map
                    setMapForType("map", value);
                    break;
                case 'map_ks':
                    // Specular map
                    setMapForType("specularMap", value);
                    break;
                case 'norm':
                    setMapForType("normalMap", value);
                    break;
                case 'map_bump':
                case 'bump':
                    // Bump texture map
                    setMapForType("bumpMap", value);
                    break;
                case 'ns':
                    // The specular exponent (defines the focus of the specular highlight)
                    // A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.
                    params.shininess = parseFloat(value);
                    break;
                case 'd':
                    n = parseFloat(value);
                    if (n < 1) {
                        params.opacity = n;
                        params.transparent = true;
                    }
                    break;
                case 'tr':
                    n = parseFloat(value);
                    if (n > 0) {
                        params.opacity = 1 - n;
                        params.transparent = true;
                    }
                    break;
                default:
                    break;
            }
        }
        this.materials[materialName] = new THREE.MeshPhongMaterial(params);
        return this.materials[materialName];
    },
    getTextureParams: function(value, matParams) {
        var texParams = {
            scale: new THREE.Vector2(1, 1),
            offset: new THREE.Vector2(0, 0)
        };
        var items = value.split(/\s+/);
        var pos;
        pos = items.indexOf('-bm');
        if (pos >= 0) {
            matParams.bumpScale = parseFloat(items[pos + 1]);
            items.splice(pos, 2);
        }
        pos = items.indexOf('-s');
        if (pos >= 0) {
            texParams.scale.set(parseFloat(items[pos + 1]), parseFloat(items[pos + 2]));
            items.splice(pos, 4); // we expect 3 parameters here!
        }
        pos = items.indexOf('-o');
        if (pos >= 0) {
            texParams.offset.set(parseFloat(items[pos + 1]), parseFloat(items[pos + 2]));
            items.splice(pos, 4); // we expect 3 parameters here!
        }
        texParams.url = items.join(' ').trim();
        return texParams;
    },
    loadTexture: function(url, mapping, onLoad, onProgress, onError) {
        var texture;
        var loader = THREE.Loader.Handlers.get(url);
        var manager = (this.manager !== undefined) ? this.manager : THREE.DefaultLoadingManager;
        if (loader === null) {
            loader = new THREE.TextureLoader(manager);
        }
        if (loader.setCrossOrigin) loader.setCrossOrigin(this.crossOrigin);
        texture = loader.load(url, onLoad, onProgress, onError);
        if (mapping !== undefined) texture.mapping = mapping;
        return texture;
    }
};

/////////////////////////////

/**
 * @author mrdoob / http://mrdoob.com/
 */
THREE.OBJLoader = ( function () {
	// o object_name | g group_name
	var object_pattern = /^[og]\s*(.+)?/;
	// mtllib file_reference
	var material_library_pattern = /^mtllib /;
	// usemtl material_name
	var material_use_pattern = /^usemtl /;
	function ParserState() {
		var state = {
			objects: [],
			object: {},
			vertices: [],
			normals: [],
			colors: [],
			uvs: [],
			materialLibraries: [],
			startObject: function ( name, fromDeclaration ) {
				// If the current object (initial from reset) is not from a g/o declaration in the parsed
				// file. We need to use it for the first parsed g/o to keep things in sync.
				if ( this.object && this.object.fromDeclaration === false ) {
					this.object.name = name;
					this.object.fromDeclaration = ( fromDeclaration !== false );
					return;
				}
				var previousMaterial = ( this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined );
				if ( this.object && typeof this.object._finalize === 'function' ) {
					this.object._finalize( true );
				}
				this.object = {
					name: name || '',
					fromDeclaration: ( fromDeclaration !== false ),
					geometry: {
						vertices: [],
						normals: [],
						colors: [],
						uvs: []
					},
					materials: [],
					smooth: true,
					startMaterial: function ( name, libraries ) {
						var previous = this._finalize( false );
						// New usemtl declaration overwrites an inherited material, except if faces were declared
						// after the material, then it must be preserved for proper MultiMaterial continuation.
						if ( previous && ( previous.inherited || previous.groupCount <= 0 ) ) {
							this.materials.splice( previous.index, 1 );
						}
						var material = {
							index: this.materials.length,
							name: name || '',
							mtllib: ( Array.isArray( libraries ) && libraries.length > 0 ? libraries[ libraries.length - 1 ] : '' ),
							smooth: ( previous !== undefined ? previous.smooth : this.smooth ),
							groupStart: ( previous !== undefined ? previous.groupEnd : 0 ),
							groupEnd: - 1,
							groupCount: - 1,
							inherited: false,
							clone: function ( index ) {
								var cloned = {
									index: ( typeof index === 'number' ? index : this.index ),
									name: this.name,
									mtllib: this.mtllib,
									smooth: this.smooth,
									groupStart: 0,
									groupEnd: - 1,
									groupCount: - 1,
									inherited: false
								};
								cloned.clone = this.clone.bind( cloned );
								return cloned;
							}
						};
						this.materials.push( material );
						return material;
					},
					currentMaterial: function () {
						if ( this.materials.length > 0 ) {
							return this.materials[ this.materials.length - 1 ];
						}
						return undefined;
					},
					_finalize: function ( end ) {
						var lastMultiMaterial = this.currentMaterial();
						if ( lastMultiMaterial && lastMultiMaterial.groupEnd === - 1 ) {
							lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
							lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
							lastMultiMaterial.inherited = false;
						}
						// Ignore objects tail materials if no face declarations followed them before a new o/g started.
						if ( end && this.materials.length > 1 ) {
							for ( var mi = this.materials.length - 1; mi >= 0; mi -- ) {
								if ( this.materials[ mi ].groupCount <= 0 ) {
									this.materials.splice( mi, 1 );
								}
							}
						}
						// Guarantee at least one empty material, this makes the creation later more straight forward.
						if ( end && this.materials.length === 0 ) {
							this.materials.push( {
								name: '',
								smooth: this.smooth
							} );
						}
						return lastMultiMaterial;
					}
				};
				// Inherit previous objects material.
				// Spec tells us that a declared material must be set to all objects until a new material is declared.
				// If a usemtl declaration is encountered while this new object is being parsed, it will
				// overwrite the inherited material. Exception being that there was already face declarations
				// to the inherited material, then it will be preserved for proper MultiMaterial continuation.
				if ( previousMaterial && previousMaterial.name && typeof previousMaterial.clone === 'function' ) {
					var declared = previousMaterial.clone( 0 );
					declared.inherited = true;
					this.object.materials.push( declared );
				}
				this.objects.push( this.object );
			},
			finalize: function () {
				if ( this.object && typeof this.object._finalize === 'function' ) {
					this.object._finalize( true );
				}
			},
			parseVertexIndex: function ( value, len ) {
				var index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;
			},
			parseNormalIndex: function ( value, len ) {
				var index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;
			},
			parseUVIndex: function ( value, len ) {
				var index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 2 ) * 2;
			},
			addVertex: function ( a, b, c ) {
				var src = this.vertices;
				var dst = this.object.geometry.vertices;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
			},
			addVertexLine: function ( a ) {
				var src = this.vertices;
				var dst = this.object.geometry.vertices;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
			},
			addNormal: function ( a, b, c ) {
				var src = this.normals;
				var dst = this.object.geometry.normals;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
			},
			addColor: function ( a, b, c ) {
				var src = this.colors;
				var dst = this.object.geometry.colors;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
			},
			addUV: function ( a, b, c ) {
				var src = this.uvs;
				var dst = this.object.geometry.uvs;
				dst.push( src[ a + 0 ], src[ a + 1 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ] );
			},
			addUVLine: function ( a ) {
				var src = this.uvs;
				var dst = this.object.geometry.uvs;
				dst.push( src[ a + 0 ], src[ a + 1 ] );
			},
			addFace: function ( a, b, c, ua, ub, uc, na, nb, nc ) {
				var vLen = this.vertices.length;
				var ia = this.parseVertexIndex( a, vLen );
				var ib = this.parseVertexIndex( b, vLen );
				var ic = this.parseVertexIndex( c, vLen );
				this.addVertex( ia, ib, ic );
				if ( ua !== undefined ) {
					var uvLen = this.uvs.length;
					ia = this.parseUVIndex( ua, uvLen );
					ib = this.parseUVIndex( ub, uvLen );
					ic = this.parseUVIndex( uc, uvLen );
					this.addUV( ia, ib, ic );
				}
				if ( na !== undefined ) {
					// Normals are many times the same. If so, skip function call and parseInt.
					var nLen = this.normals.length;
					ia = this.parseNormalIndex( na, nLen );
					ib = na === nb ? ia : this.parseNormalIndex( nb, nLen );
					ic = na === nc ? ia : this.parseNormalIndex( nc, nLen );
					this.addNormal( ia, ib, ic );
				}
				if ( this.colors.length > 0 ) {
					this.addColor( ia, ib, ic );
				}
			},
			addLineGeometry: function ( vertices, uvs ) {
				this.object.geometry.type = 'Line';
				var vLen = this.vertices.length;
				var uvLen = this.uvs.length;
				for ( var vi = 0, l = vertices.length; vi < l; vi ++ ) {
					this.addVertexLine( this.parseVertexIndex( vertices[ vi ], vLen ) );
				}
				for ( var uvi = 0, l = uvs.length; uvi < l; uvi ++ ) {
					this.addUVLine( this.parseUVIndex( uvs[ uvi ], uvLen ) );
				}
			}
		};
		state.startObject( '', false );
		return state;
	}
	//
	function OBJLoader( manager ) {
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
		this.materials = null;
	}
	OBJLoader.prototype = {
		constructor: OBJLoader,
		load: function ( url, onLoad, onProgress, onError ) {
			var scope = this;
			var loader = new THREE.FileLoader( scope.manager );
			loader.setPath( this.path );
			loader.load( url, function ( text ) {
				onLoad( scope.parse( text ) );
			}, onProgress, onError );
		},
		setPath: function ( value ) {
			this.path = value;
		},
		setMaterials: function ( materials ) {
			this.materials = materials;
			return this;
		},
		parse: function ( text ) {
			console.time( 'OBJLoader' );
			var state = new ParserState();
			if ( text.indexOf( '\r\n' ) !== - 1 ) {
				// This is faster than String.split with regex that splits on both
				text = text.replace( /\r\n/g, '\n' );
			}
			if ( text.indexOf( '\\\n' ) !== - 1 ) {
				// join lines separated by a line continuation character (\)
				text = text.replace( /\\\n/g, '' );
			}
			var lines = text.split( '\n' );
			var line = '', lineFirstChar = '';
			var lineLength = 0;
			var result = [];
			// Faster to just trim left side of the line. Use if available.
			var trimLeft = ( typeof ''.trimLeft === 'function' );
			for ( var i = 0, l = lines.length; i < l; i ++ ) {
				line = lines[ i ];
				line = trimLeft ? line.trimLeft() : line.trim();
				lineLength = line.length;
				if ( lineLength === 0 ) continue;
				lineFirstChar = line.charAt( 0 );
				// @todo invoke passed in handler if any
				if ( lineFirstChar === '#' ) continue;
				if ( lineFirstChar === 'v' ) {
					var data = line.split( /\s+/ );
					switch ( data[ 0 ] ) {
						case 'v':
							state.vertices.push(
								parseFloat( data[ 1 ] ),
								parseFloat( data[ 2 ] ),
								parseFloat( data[ 3 ] )
							);
							if ( data.length === 8 ) {
								state.colors.push(
									parseFloat( data[ 4 ] ),
									parseFloat( data[ 5 ] ),
									parseFloat( data[ 6 ] )
								);
							}
							break;
						case 'vn':
							state.normals.push(
								parseFloat( data[ 1 ] ),
								parseFloat( data[ 2 ] ),
								parseFloat( data[ 3 ] )
							);
							break;
						case 'vt':
							state.uvs.push(
								parseFloat( data[ 1 ] ),
								parseFloat( data[ 2 ] )
							);
							break;
					}
				} else if ( lineFirstChar === 'f' ) {
					var lineData = line.substr( 1 ).trim();
					var vertexData = lineData.split( /\s+/ );
					var faceVertices = [];
					// Parse the face vertex data into an easy to work with format
					for ( var j = 0, jl = vertexData.length; j < jl; j ++ ) {
						var vertex = vertexData[ j ];
						if ( vertex.length > 0 ) {
							var vertexParts = vertex.split( '/' );
							faceVertices.push( vertexParts );
						}
					}
					// Draw an edge between the first vertex and all subsequent vertices to form an n-gon
					var v1 = faceVertices[ 0 ];
					for ( var j = 1, jl = faceVertices.length - 1; j < jl; j ++ ) {
						var v2 = faceVertices[ j ];
						var v3 = faceVertices[ j + 1 ];
						state.addFace(
							v1[ 0 ], v2[ 0 ], v3[ 0 ],
							v1[ 1 ], v2[ 1 ], v3[ 1 ],
							v1[ 2 ], v2[ 2 ], v3[ 2 ]
						);
					}
				} else if ( lineFirstChar === 'l' ) {
					var lineParts = line.substring( 1 ).trim().split( " " );
					var lineVertices = [], lineUVs = [];
					if ( line.indexOf( "/" ) === - 1 ) {
						lineVertices = lineParts;
					} else {
						for ( var li = 0, llen = lineParts.length; li < llen; li ++ ) {
							var parts = lineParts[ li ].split( "/" );
							if ( parts[ 0 ] !== "" ) lineVertices.push( parts[ 0 ] );
							if ( parts[ 1 ] !== "" ) lineUVs.push( parts[ 1 ] );
						}
					}
					state.addLineGeometry( lineVertices, lineUVs );
				} else if ( ( result = object_pattern.exec( line ) ) !== null ) {
					// o object_name
					// or
					// g group_name
					// WORKAROUND: https://bugs.chromium.org/p/v8/issues/detail?id=2869
					// var name = result[ 0 ].substr( 1 ).trim();
					var name = ( " " + result[ 0 ].substr( 1 ).trim() ).substr( 1 );
					state.startObject( name );
				} else if ( material_use_pattern.test( line ) ) {
					// material
					state.object.startMaterial( line.substring( 7 ).trim(), state.materialLibraries );
				} else if ( material_library_pattern.test( line ) ) {
					// mtl file
					state.materialLibraries.push( line.substring( 7 ).trim() );
				} else if ( lineFirstChar === 's' ) {
					result = line.split( ' ' );
					// smooth shading
					// @todo Handle files that have varying smooth values for a set of faces inside one geometry,
					// but does not define a usemtl for each face set.
					// This should be detected and a dummy material created (later MultiMaterial and geometry groups).
					// This requires some care to not create extra material on each smooth value for "normal" obj files.
					// where explicit usemtl defines geometry groups.
					// Example asset: examples/models/obj/cerberus/Cerberus.obj
					/*
					 * http://paulbourke.net/dataformats/obj/
					 * or
					 * http://www.cs.utah.edu/~boulos/cs3505/obj_spec.pdf
					 *
					 * From chapter "Grouping" Syntax explanation "s group_number":
					 * "group_number is the smoothing group number. To turn off smoothing groups, use a value of 0 or off.
					 * Polygonal elements use group numbers to put elements in different smoothing groups. For free-form
					 * surfaces, smoothing groups are either turned on or off; there is no difference between values greater
					 * than 0."
					 */
					if ( result.length > 1 ) {
						var value = result[ 1 ].trim().toLowerCase();
						state.object.smooth = ( value !== '0' && value !== 'off' );
					} else {
						// ZBrush can produce "s" lines #11707
						state.object.smooth = true;
					}
					var material = state.object.currentMaterial();
					if ( material ) material.smooth = state.object.smooth;
				} else {
					// Handle null terminated files without exception
					if ( line === '\0' ) continue;
					throw new Error( 'THREE.OBJLoader: Unexpected line: "' + line + '"' );
				}
			}
			state.finalize();
			var container = new THREE.Group();
			container.materialLibraries = [].concat( state.materialLibraries );
			for ( var i = 0, l = state.objects.length; i < l; i ++ ) {
				var object = state.objects[ i ];
				var geometry = object.geometry;
				var materials = object.materials;
				var isLine = ( geometry.type === 'Line' );
				// Skip o/g line declarations that did not follow with any faces
				if ( geometry.vertices.length === 0 ) continue;
				var buffergeometry = new THREE.BufferGeometry();
				buffergeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( geometry.vertices, 3 ) );
				if ( geometry.normals.length > 0 ) {
					buffergeometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( geometry.normals, 3 ) );
				} else {
					buffergeometry.computeVertexNormals();
				}
				if ( geometry.colors.length > 0 ) {
					buffergeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( geometry.colors, 3 ) );
				}
				if ( geometry.uvs.length > 0 ) {
					buffergeometry.addAttribute( 'uv', new THREE.Float32BufferAttribute( geometry.uvs, 2 ) );
				}
				// Create materials
				var createdMaterials = [];
				for ( var mi = 0, miLen = materials.length; mi < miLen; mi ++ ) {
					var sourceMaterial = materials[ mi ];
					var material = undefined;
					if ( this.materials !== null ) {
						material = this.materials.create( sourceMaterial.name );
						// mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.
						if ( isLine && material && ! ( material instanceof THREE.LineBasicMaterial ) ) {
							var materialLine = new THREE.LineBasicMaterial();
							materialLine.copy( material );
							material = materialLine;
						}
					}
					if ( ! material ) {
						material = ( ! isLine ? new THREE.MeshPhongMaterial() : new THREE.LineBasicMaterial() );
						material.name = sourceMaterial.name;
					}
					material.flatShading = sourceMaterial.smooth ? false : true;
					createdMaterials.push( material );
				}
				// Create mesh
				var mesh;
				if ( createdMaterials.length > 1 ) {
					for ( var mi = 0, miLen = materials.length; mi < miLen; mi ++ ) {
						var sourceMaterial = materials[ mi ];
						buffergeometry.addGroup( sourceMaterial.groupStart, sourceMaterial.groupCount, mi );
					}
					mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, createdMaterials ) : new THREE.LineSegments( buffergeometry, createdMaterials ) );
				} else {
					mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, createdMaterials[ 0 ] ) : new THREE.LineSegments( buffergeometry, createdMaterials[ 0 ] ) );
				}
				mesh.name = object.name;
				container.add( mesh );
			}
			console.timeEnd( 'OBJLoader' );
			return container;
		}
	};
	return OBJLoader;
} )();



/////////////////////////////
///
/////////////////////////////


/*
 * Autodesk 3DS threee.js file loader, based on lib3ds.
 *
 * Loads geometry with uv and materials basic properties with texture support.
 *
 * @author @tentone
 * @author @timknip
 * @class TDSLoader
 * @constructor
 */


THREE.TDSLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
	this.debug = false;

	this.group = null;
	this.position = 0;

	this.materials = [];
	this.meshes = [];

};

THREE.TDSLoader.prototype = {

	constructor: THREE.TDSLoader,

	/**
	 * Load 3ds file from url.
	 *
	 * @method load
	 * @param {[type]} url URL for the file.
	 * @param {Function} onLoad onLoad callback, receives group Object3D as argument.
	 * @param {Function} onProgress onProgress callback.
	 * @param {Function} onError onError callback.
	 */
	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var path = this.path !== undefined ? this.path : THREE.LoaderUtils.extractUrlBase( url );

		var loader = new THREE.FileLoader( this.manager );

		loader.setResponseType( 'arraybuffer' );

		loader.load( url, function ( data ) {

			onLoad( scope.parse( data, path ) );

		}, onProgress, onError );

	},

	/**
	 * Parse arraybuffer data and load 3ds file.
	 *
	 * @method parse
	 * @param {ArrayBuffer} arraybuffer Arraybuffer data to be loaded.
	 * @param {String} path Path for external resources.
	 * @return {Object3D} Group loaded from 3ds file.
	 */
	parse: function ( arraybuffer, path ) {

		this.group = new THREE.Group();
		this.position = 0;
		this.materials = [];
		this.meshes = [];

		this.readFile( arraybuffer, path );

		for ( var i = 0; i < this.meshes.length; i ++ ) {

			this.group.add( this.meshes[ i ] );

		}

		return this.group;

	},

	/**
	 * Decode file content to read 3ds data.
	 *
	 * @method readFile
	 * @param {ArrayBuffer} arraybuffer Arraybuffer data to be loaded.
	 */
	readFile: function ( arraybuffer, path ) {

		var data = new DataView( arraybuffer );
		var chunk = this.readChunk( data );

		if ( chunk.id === MLIBMAGIC || chunk.id === CMAGIC || chunk.id === M3DMAGIC ) {

			var next = this.nextChunk( data, chunk );

			while ( next !== 0 ) {

				if ( next === M3D_VERSION ) {

					var version = this.readDWord( data );
					this.debugMessage( '3DS file version: ' + version );

				} else if ( next === MDATA ) {

					this.resetPosition( data );
					this.readMeshData( data, path );

				} else {

					this.debugMessage( 'Unknown main chunk: ' + next.toString( 16 ) );

				}

				next = this.nextChunk( data, chunk );

			}

		}

		this.debugMessage( 'Parsed ' + this.meshes.length + ' meshes' );

	},

	/**
	 * Read mesh data chunk.
	 *
	 * @method readMeshData
	 * @param {Dataview} data Dataview in use.
	 */
	readMeshData: function ( data, path ) {

		var chunk = this.readChunk( data );
		var next = this.nextChunk( data, chunk );

		while ( next !== 0 ) {

			if ( next === MESH_VERSION ) {

				var version = + this.readDWord( data );
				this.debugMessage( 'Mesh Version: ' + version );

			} else if ( next === MASTER_SCALE ) {

				var scale = this.readFloat( data );
				this.debugMessage( 'Master scale: ' + scale );
				this.group.scale.set( scale, scale, scale );

			} else if ( next === NAMED_OBJECT ) {

				this.debugMessage( 'Named Object' );
				this.resetPosition( data );
				this.readNamedObject( data );

			} else if ( next === MAT_ENTRY ) {

				this.debugMessage( 'Material' );
				this.resetPosition( data );
				this.readMaterialEntry( data, path );

			} else {

				this.debugMessage( 'Unknown MDATA chunk: ' + next.toString( 16 ) );

			}

			next = this.nextChunk( data, chunk );

		}

	},

	/**
	 * Read named object chunk.
	 *
	 * @method readNamedObject
	 * @param {Dataview} data Dataview in use.
	 */
	readNamedObject: function ( data ) {

		var chunk = this.readChunk( data );
		var name = this.readString( data, 64 );
		chunk.cur = this.position;

		var next = this.nextChunk( data, chunk );
		while ( next !== 0 ) {

			if ( next === N_TRI_OBJECT ) {

				this.resetPosition( data );
				var mesh = this.readMesh( data );
				mesh.name = name;
				this.meshes.push( mesh );

			} else {

				this.debugMessage( 'Unknown named object chunk: ' + next.toString( 16 ) );

			}

			next = this.nextChunk( data, chunk );

		}

		this.endChunk( chunk );

	},

	/**
	 * Read material data chunk and add it to the material list.
	 *
	 * @method readMaterialEntry
	 * @param {Dataview} data Dataview in use.
	 */
	readMaterialEntry: function ( data, path ) {

		var chunk = this.readChunk( data );
		var next = this.nextChunk( data, chunk );
		var material = new THREE.MeshPhongMaterial();

		while ( next !== 0 ) {

			if ( next === MAT_NAME ) {

				material.name = this.readString( data, 64 );
				this.debugMessage( '   Name: ' + material.name );

			} else if ( next === MAT_WIRE ) {

				this.debugMessage( '   Wireframe' );
				material.wireframe = true;

			} else if ( next === MAT_WIRE_SIZE ) {

				var value = this.readByte( data );
				material.wireframeLinewidth = value;
				this.debugMessage( '   Wireframe Thickness: ' + value );

			} else if ( next === MAT_TWO_SIDE ) {

				material.side = THREE.DoubleSide;
				this.debugMessage( '   DoubleSided' );

			} else if ( next === MAT_ADDITIVE ) {

				this.debugMessage( '   Additive Blending' );
				material.blending = THREE.AdditiveBlending;

			} else if ( next === MAT_DIFFUSE ) {

				this.debugMessage( '   Diffuse Color' );
				material.color = this.readColor( data );

			} else if ( next === MAT_SPECULAR ) {

				this.debugMessage( '   Specular Color' );
				material.specular = this.readColor( data );

			} else if ( next === MAT_AMBIENT ) {

				this.debugMessage( '   Ambient color' );
				material.color = this.readColor( data );

			} else if ( next === MAT_SHININESS ) {

				var shininess = this.readWord( data );
				material.shininess = shininess;
				this.debugMessage( '   Shininess : ' + shininess );

			} else if ( next === MAT_TEXMAP ) {

				this.debugMessage( '   ColorMap' );
				this.resetPosition( data );
				material.map = this.readMap( data, path );

			} else if ( next === MAT_BUMPMAP ) {

				this.debugMessage( '   BumpMap' );
				this.resetPosition( data );
				material.bumpMap = this.readMap( data, path );

			} else if ( next === MAT_OPACMAP ) {

				this.debugMessage( '   OpacityMap' );
				this.resetPosition( data );
				material.alphaMap = this.readMap( data, path );

			} else if ( next === MAT_SPECMAP ) {

				this.debugMessage( '   SpecularMap' );
				this.resetPosition( data );
				material.specularMap = this.readMap( data, path );

			} else {

				this.debugMessage( '   Unknown material chunk: ' + next.toString( 16 ) );

			}

			next = this.nextChunk( data, chunk );

		}

		this.endChunk( chunk );

		this.materials[ material.name ] = material;

	},

	/**
	 * Read mesh data chunk.
	 *
	 * @method readMesh
	 * @param {Dataview} data Dataview in use.
	 */
	readMesh: function ( data ) {

		var chunk = this.readChunk( data );
		var next = this.nextChunk( data, chunk );

		var useBufferGeometry = false;
		var geometry = null;
		var uvs = [];

		if ( useBufferGeometry ) {

			geometry = new THREE.BufferGeometry();

		}	else {

			geometry = new THREE.Geometry();

		}

		var material = new THREE.MeshPhongMaterial();
		var mesh = new THREE.Mesh( geometry, material );
		mesh.name = 'mesh';

		while ( next !== 0 ) {

			if ( next === POINT_ARRAY ) {

				var points = this.readWord( data );

				this.debugMessage( '   Vertex: ' + points );

				//BufferGeometry

				if ( useBufferGeometry )	{

					var vertices = [];
					for ( var i = 0; i < points; i ++ )		{

						vertices.push( this.readFloat( data ) );
						vertices.push( this.readFloat( data ) );
						vertices.push( this.readFloat( data ) );

					}

					geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( vertices ), 3 ) );

				} else	{ //Geometry

					for ( var i = 0; i < points; i ++ )		{

						geometry.vertices.push( new THREE.Vector3( this.readFloat( data ), this.readFloat( data ), this.readFloat( data ) ) );

					}

				}

			} else if ( next === FACE_ARRAY ) {

				this.resetPosition( data );
				this.readFaceArray( data, mesh );

			} else if ( next === TEX_VERTS ) {

				var texels = this.readWord( data );

				this.debugMessage( '   UV: ' + texels );

				//BufferGeometry

				if ( useBufferGeometry )	{

					var uvs = [];
					for ( var i = 0; i < texels; i ++ )		{

						uvs.push( this.readFloat( data ) );
						uvs.push( this.readFloat( data ) );

					}
					geometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( uvs ), 2 ) );

				} else { //Geometry

					uvs = [];
					for ( var i = 0; i < texels; i ++ )		{

						uvs.push( new THREE.Vector2( this.readFloat( data ), this.readFloat( data ) ) );

					}

				}

			} else if ( next === MESH_MATRIX ) {

				this.debugMessage( '   Tranformation Matrix (TODO)' );

				var values = [];
				for ( var i = 0; i < 12; i ++ ) {

					values[ i ] = this.readFloat( data );

				}

				var matrix = new THREE.Matrix4();

				//X Line
				matrix.elements[ 0 ] = values[ 0 ];
				matrix.elements[ 1 ] = values[ 6 ];
				matrix.elements[ 2 ] = values[ 3 ];
				matrix.elements[ 3 ] = values[ 9 ];

				//Y Line
				matrix.elements[ 4 ] = values[ 2 ];
				matrix.elements[ 5 ] = values[ 8 ];
				matrix.elements[ 6 ] = values[ 5 ];
				matrix.elements[ 7 ] = values[ 11 ];

				//Z Line
				matrix.elements[ 8 ] = values[ 1 ];
				matrix.elements[ 9 ] = values[ 7 ];
				matrix.elements[ 10 ] = values[ 4 ];
				matrix.elements[ 11 ] = values[ 10 ];

				//W Line
				matrix.elements[ 12 ] = 0;
				matrix.elements[ 13 ] = 0;
				matrix.elements[ 14 ] = 0;
				matrix.elements[ 15 ] = 1;

				matrix.transpose();

				var inverse = new THREE.Matrix4();
				inverse.getInverse( matrix, true );
				geometry.applyMatrix( inverse );

				matrix.decompose( mesh.position, mesh.quaternion, mesh.scale );

			} else {

				this.debugMessage( '   Unknown mesh chunk: ' + next.toString( 16 ) );

			}

			next = this.nextChunk( data, chunk );

		}

		this.endChunk( chunk );

		if ( ! useBufferGeometry ) {

			//geometry.faceVertexUvs[0][faceIndex][vertexIndex]

			if ( uvs.length > 0 ) {

				var faceUV = [];

				for ( var i = 0; i < geometry.faces.length; i ++ ) {

					faceUV.push( [ uvs[ geometry.faces[ i ].a ], uvs[ geometry.faces[ i ].b ], uvs[ geometry.faces[ i ].c ] ] );

				}

				geometry.faceVertexUvs[ 0 ] = faceUV;

			}

			geometry.computeVertexNormals();

		}

		return mesh;

	},

	/**
	 * Read face array data chunk.
	 *
	 * @method readFaceArray
	 * @param {Dataview} data Dataview in use.
	 * @param {Mesh} mesh Mesh to be filled with the data read.
	 */
	readFaceArray: function ( data, mesh ) {

		var chunk = this.readChunk( data );
		var faces = this.readWord( data );

		this.debugMessage( '   Faces: ' + faces );

		for ( var i = 0; i < faces; ++ i ) {

			mesh.geometry.faces.push( new THREE.Face3( this.readWord( data ), this.readWord( data ), this.readWord( data ) ) );

			var visibility = this.readWord( data );

		}

		//The rest of the FACE_ARRAY chunk is subchunks

		while ( this.position < chunk.end ) {

			var chunk = this.readChunk( data );

			if ( chunk.id === MSH_MAT_GROUP ) {

				this.debugMessage( '      Material Group' );

				this.resetPosition( data );

				var group = this.readMaterialGroup( data );

				var material = this.materials[ group.name ];

				if ( material !== undefined )	{

					mesh.material = material;

					if ( material.name === '' )		{

						material.name = mesh.name;

					}

				}

			} else {

				this.debugMessage( '      Unknown face array chunk: ' + chunk.toString( 16 ) );

			}

			this.endChunk( chunk );

		}

		this.endChunk( chunk );

	},

	/**
	 * Read texture map data chunk.
	 *
	 * @method readMap
	 * @param {Dataview} data Dataview in use.
	 * @return {Texture} Texture read from this data chunk.
	 */
	readMap: function ( data, path ) {

		var chunk = this.readChunk( data );
		var next = this.nextChunk( data, chunk );
		var texture = {};

		var loader = new THREE.TextureLoader( this.manager );
		loader.setPath( path );

		while ( next !== 0 ) {

			if ( next === MAT_MAPNAME ) {

				var name = this.readString( data, 128 );
				texture = loader.load( name );

				this.debugMessage( '      File: ' + path + name );

			} else if ( next === MAT_MAP_UOFFSET ) {

				texture.offset.x = this.readFloat( data );
				this.debugMessage( '      OffsetX: ' + texture.offset.x );

			} else if ( next === MAT_MAP_VOFFSET ) {

				texture.offset.y = this.readFloat( data );
				this.debugMessage( '      OffsetY: ' + texture.offset.y );

			} else if ( next === MAT_MAP_USCALE ) {

				texture.repeat.x = this.readFloat( data );
				this.debugMessage( '      RepeatX: ' + texture.repeat.x );

			} else if ( next === MAT_MAP_VSCALE ) {

				texture.repeat.y = this.readFloat( data );
				this.debugMessage( '      RepeatY: ' + texture.repeat.y );

			} else {

				this.debugMessage( '      Unknown map chunk: ' + next.toString( 16 ) );

			}

			next = this.nextChunk( data, chunk );

		}

		this.endChunk( chunk );

		return texture;

	},

	/**
	 * Read material group data chunk.
	 *
	 * @method readMaterialGroup
	 * @param {Dataview} data Dataview in use.
	 * @return {Object} Object with name and index of the object.
	 */
	readMaterialGroup: function ( data ) {

		var chunk = this.readChunk( data );
		var name = this.readString( data, 64 );
		var numFaces = this.readWord( data );

		this.debugMessage( '         Name: ' + name );
		this.debugMessage( '         Faces: ' + numFaces );

		var index = [];
		for ( var i = 0; i < numFaces; ++ i ) {

			index.push( this.readWord( data ) );

		}

		return { name: name, index: index };

	},

	/**
	 * Read a color value.
	 *
	 * @method readColor
	 * @param {DataView} data Dataview.
	 * @return {Color} Color value read..
	 */
	readColor: function ( data ) {

		var chunk = this.readChunk( data );
		var color = new THREE.Color();

		if ( chunk.id === COLOR_24 || chunk.id === LIN_COLOR_24 ) {

			var r = this.readByte( data );
			var g = this.readByte( data );
			var b = this.readByte( data );

			color.setRGB( r / 255, g / 255, b / 255 );

			this.debugMessage( '      Color: ' + color.r + ', ' + color.g + ', ' + color.b );

		}	else if ( chunk.id === COLOR_F || chunk.id === LIN_COLOR_F ) {

			var r = this.readFloat( data );
			var g = this.readFloat( data );
			var b = this.readFloat( data );

			color.setRGB( r, g, b );

			this.debugMessage( '      Color: ' + color.r + ', ' + color.g + ', ' + color.b );

		}	else {

			this.debugMessage( '      Unknown color chunk: ' + chunk.toString( 16 ) );

		}

		this.endChunk( chunk );
		return color;

	},

	/**
	 * Read next chunk of data.
	 *
	 * @method readChunk
	 * @param {DataView} data Dataview.
	 * @return {Object} Chunk of data read.
	 */
	readChunk: function ( data ) {

		var chunk = {};

		chunk.cur = this.position;
		chunk.id = this.readWord( data );
		chunk.size = this.readDWord( data );
		chunk.end = chunk.cur + chunk.size;
		chunk.cur += 6;

		return chunk;

	},

	/**
	 * Set position to the end of the current chunk of data.
	 *
	 * @method endChunk
	 * @param {Object} chunk Data chunk.
	 */
	endChunk: function ( chunk ) {

		this.position = chunk.end;

	},

	/**
	 * Move to the next data chunk.
	 *
	 * @method nextChunk
	 * @param {DataView} data Dataview.
	 * @param {Object} chunk Data chunk.
	 */
	nextChunk: function ( data, chunk ) {

		if ( chunk.cur >= chunk.end ) {

			return 0;

		}

		this.position = chunk.cur;

		try {

			var next = this.readChunk( data );
			chunk.cur += next.size;
			return next.id;

		}	catch ( e ) {

			this.debugMessage( 'Unable to read chunk at ' + this.position );
			return 0;

		}

	},

	/**
	 * Reset dataview position.
	 *
	 * @method resetPosition
	 * @param {DataView} data Dataview.
	 */
	resetPosition: function () {

		this.position -= 6;

	},

	/**
	 * Read byte value.
	 *
	 * @method readByte
	 * @param {DataView} data Dataview to read data from.
	 * @return {Number} Data read from the dataview.
	 */
	readByte: function ( data ) {

		var v = data.getUint8( this.position, true );
		this.position += 1;
		return v;

	},

	/**
	 * Read 32 bit float value.
	 *
	 * @method readFloat
	 * @param {DataView} data Dataview to read data from.
	 * @return {Number} Data read from the dataview.
	 */
	readFloat: function ( data ) {

		try {

			var v = data.getFloat32( this.position, true );
			this.position += 4;
			return v;

		}	catch ( e ) {

			this.debugMessage( e + ' ' + this.position + ' ' + data.byteLength );

		}

	},

	/**
	 * Read 32 bit signed integer value.
	 *
	 * @method readInt
	 * @param {DataView} data Dataview to read data from.
	 * @return {Number} Data read from the dataview.
	 */
	readInt: function ( data ) {

		var v = data.getInt32( this.position, true );
		this.position += 4;
		return v;

	},

	/**
	 * Read 16 bit signed integer value.
	 *
	 * @method readShort
	 * @param {DataView} data Dataview to read data from.
	 * @return {Number} Data read from the dataview.
	 */
	readShort: function ( data ) {

		var v = data.getInt16( this.position, true );
		this.position += 2;
		return v;

	},

	/**
	 * Read 64 bit unsigned integer value.
	 *
	 * @method readDWord
	 * @param {DataView} data Dataview to read data from.
	 * @return {Number} Data read from the dataview.
	 */
	readDWord: function ( data ) {

		var v = data.getUint32( this.position, true );
		this.position += 4;
		return v;

	},

	/**
	 * Read 32 bit unsigned integer value.
	 *
	 * @method readWord
	 * @param {DataView} data Dataview to read data from.
	 * @return {Number} Data read from the dataview.
	 */
	readWord: function ( data ) {

		var v = data.getUint16( this.position, true );
		this.position += 2;
		return v;

	},

	/**
	 * Read string value.
	 *
	 * @method readString
	 * @param {DataView} data Dataview to read data from.
	 * @param {Number} maxLength Max size of the string to be read.
	 * @return {String} Data read from the dataview.
	 */
	readString: function ( data, maxLength ) {

		var s = '';

		for ( var i = 0; i < maxLength; i ++ ) {

			var c = this.readByte( data );
			if ( ! c ) {

				break;

			}

			s += String.fromCharCode( c );

		}

		return s;

	},

	/**
	 * Set resource path used to determine the file path to attached resources.
	 *
	 * @method setPath
	 * @param {String} path Path to resources.
	 * @return Self for chaining.
	 */
	setPath: function ( path ) {

		this.path = path;

		return this;

	},

	/**
	 * Print debug message to the console.
	 *
	 * Is controlled by a flag to show or hide debug messages.
	 *
	 * @method debugMessage
	 * @param {Object} message Debug message to print to the console.
	 */
	debugMessage: function ( message ) {

		if ( this.debug ) {

			console.log( message );

		}

	}
};

var NULL_CHUNK = 0x0000;
var M3DMAGIC = 0x4D4D;
var SMAGIC = 0x2D2D;
var LMAGIC = 0x2D3D;
var MLIBMAGIC = 0x3DAA;
var MATMAGIC = 0x3DFF;
var CMAGIC = 0xC23D;
var M3D_VERSION = 0x0002;
var M3D_KFVERSION = 0x0005;
var COLOR_F = 0x0010;
var COLOR_24 = 0x0011;
var LIN_COLOR_24 = 0x0012;
var LIN_COLOR_F = 0x0013;
var INT_PERCENTAGE = 0x0030;
var FLOAT_PERCENTAGE = 0x0031;
var MDATA = 0x3D3D;
var MESH_VERSION = 0x3D3E;
var MASTER_SCALE = 0x0100;
var LO_SHADOW_BIAS = 0x1400;
var HI_SHADOW_BIAS = 0x1410;
var SHADOW_MAP_SIZE = 0x1420;
var SHADOW_SAMPLES = 0x1430;
var SHADOW_RANGE = 0x1440;
var SHADOW_FILTER = 0x1450;
var RAY_BIAS = 0x1460;
var O_CONSTS = 0x1500;
var AMBIENT_LIGHT = 0x2100;
var BIT_MAP = 0x1100;
var SOLID_BGND = 0x1200;
var V_GRADIENT = 0x1300;
var USE_BIT_MAP = 0x1101;
var USE_SOLID_BGND = 0x1201;
var USE_V_GRADIENT = 0x1301;
var FOG = 0x2200;
var FOG_BGND = 0x2210;
var LAYER_FOG = 0x2302;
var DISTANCE_CUE = 0x2300;
var DCUE_BGND = 0x2310;
var USE_FOG = 0x2201;
var USE_LAYER_FOG = 0x2303;
var USE_DISTANCE_CUE = 0x2301;
var MAT_ENTRY = 0xAFFF;
var MAT_NAME = 0xA000;
var MAT_AMBIENT = 0xA010;
var MAT_DIFFUSE = 0xA020;
var MAT_SPECULAR = 0xA030;
var MAT_SHININESS = 0xA040;
var MAT_SHIN2PCT = 0xA041;
var MAT_TRANSPARENCY = 0xA050;
var MAT_XPFALL = 0xA052;
var MAT_USE_XPFALL = 0xA240;
var MAT_REFBLUR = 0xA053;
var MAT_SHADING = 0xA100;
var MAT_USE_REFBLUR = 0xA250;
var MAT_SELF_ILLUM = 0xA084;
var MAT_TWO_SIDE = 0xA081;
var MAT_DECAL = 0xA082;
var MAT_ADDITIVE = 0xA083;
var MAT_WIRE = 0xA085;
var MAT_FACEMAP = 0xA088;
var MAT_TRANSFALLOFF_IN = 0xA08A;
var MAT_PHONGSOFT = 0xA08C;
var MAT_WIREABS = 0xA08E;
var MAT_WIRE_SIZE = 0xA087;
var MAT_TEXMAP = 0xA200;
var MAT_SXP_TEXT_DATA = 0xA320;
var MAT_TEXMASK = 0xA33E;
var MAT_SXP_TEXTMASK_DATA = 0xA32A;
var MAT_TEX2MAP = 0xA33A;
var MAT_SXP_TEXT2_DATA = 0xA321;
var MAT_TEX2MASK = 0xA340;
var MAT_SXP_TEXT2MASK_DATA = 0xA32C;
var MAT_OPACMAP = 0xA210;
var MAT_SXP_OPAC_DATA = 0xA322;
var MAT_OPACMASK = 0xA342;
var MAT_SXP_OPACMASK_DATA = 0xA32E;
var MAT_BUMPMAP = 0xA230;
var MAT_SXP_BUMP_DATA = 0xA324;
var MAT_BUMPMASK = 0xA344;
var MAT_SXP_BUMPMASK_DATA = 0xA330;
var MAT_SPECMAP = 0xA204;
var MAT_SXP_SPEC_DATA = 0xA325;
var MAT_SPECMASK = 0xA348;
var MAT_SXP_SPECMASK_DATA = 0xA332;
var MAT_SHINMAP = 0xA33C;
var MAT_SXP_SHIN_DATA = 0xA326;
var MAT_SHINMASK = 0xA346;
var MAT_SXP_SHINMASK_DATA = 0xA334;
var MAT_SELFIMAP = 0xA33D;
var MAT_SXP_SELFI_DATA = 0xA328;
var MAT_SELFIMASK = 0xA34A;
var MAT_SXP_SELFIMASK_DATA = 0xA336;
var MAT_REFLMAP = 0xA220;
var MAT_REFLMASK = 0xA34C;
var MAT_SXP_REFLMASK_DATA = 0xA338;
var MAT_ACUBIC = 0xA310;
var MAT_MAPNAME = 0xA300;
var MAT_MAP_TILING = 0xA351;
var MAT_MAP_TEXBLUR = 0xA353;
var MAT_MAP_USCALE = 0xA354;
var MAT_MAP_VSCALE = 0xA356;
var MAT_MAP_UOFFSET = 0xA358;
var MAT_MAP_VOFFSET = 0xA35A;
var MAT_MAP_ANG = 0xA35C;
var MAT_MAP_COL1 = 0xA360;
var MAT_MAP_COL2 = 0xA362;
var MAT_MAP_RCOL = 0xA364;
var MAT_MAP_GCOL = 0xA366;
var MAT_MAP_BCOL = 0xA368;
var NAMED_OBJECT = 0x4000;
var N_DIRECT_LIGHT = 0x4600;
var DL_OFF = 0x4620;
var DL_OUTER_RANGE = 0x465A;
var DL_INNER_RANGE = 0x4659;
var DL_MULTIPLIER = 0x465B;
var DL_EXCLUDE = 0x4654;
var DL_ATTENUATE = 0x4625;
var DL_SPOTLIGHT = 0x4610;
var DL_SPOT_ROLL = 0x4656;
var DL_SHADOWED = 0x4630;
var DL_LOCAL_SHADOW2 = 0x4641;
var DL_SEE_CONE = 0x4650;
var DL_SPOT_RECTANGULAR = 0x4651;
var DL_SPOT_ASPECT = 0x4657;
var DL_SPOT_PROJECTOR = 0x4653;
var DL_SPOT_OVERSHOOT = 0x4652;
var DL_RAY_BIAS = 0x4658;
var DL_RAYSHAD = 0x4627;
var N_CAMERA = 0x4700;
var CAM_SEE_CONE = 0x4710;
var CAM_RANGES = 0x4720;
var OBJ_HIDDEN = 0x4010;
var OBJ_VIS_LOFTER = 0x4011;
var OBJ_DOESNT_CAST = 0x4012;
var OBJ_DONT_RECVSHADOW = 0x4017;
var OBJ_MATTE = 0x4013;
var OBJ_FAST = 0x4014;
var OBJ_PROCEDURAL = 0x4015;
var OBJ_FROZEN = 0x4016;
var N_TRI_OBJECT = 0x4100;
var POINT_ARRAY = 0x4110;
var POINT_FLAG_ARRAY = 0x4111;
var FACE_ARRAY = 0x4120;
var MSH_MAT_GROUP = 0x4130;
var SMOOTH_GROUP = 0x4150;
var MSH_BOXMAP = 0x4190;
var TEX_VERTS = 0x4140;
var MESH_MATRIX = 0x4160;
var MESH_COLOR = 0x4165;
var MESH_TEXTURE_INFO = 0x4170;
var KFDATA = 0xB000;
var KFHDR = 0xB00A;
var KFSEG = 0xB008;
var KFCURTIME = 0xB009;
var AMBIENT_NODE_TAG = 0xB001;
var OBJECT_NODE_TAG = 0xB002;
var CAMERA_NODE_TAG = 0xB003;
var TARGET_NODE_TAG = 0xB004;
var LIGHT_NODE_TAG = 0xB005;
var L_TARGET_NODE_TAG = 0xB006;
var SPOTLIGHT_NODE_TAG = 0xB007;
var NODE_ID = 0xB030;
var NODE_HDR = 0xB010;
var PIVOT = 0xB013;
var INSTANCE_NAME = 0xB011;
var MORPH_SMOOTH = 0xB015;
var BOUNDBOX = 0xB014;
var POS_TRACK_TAG = 0xB020;
var COL_TRACK_TAG = 0xB025;
var ROT_TRACK_TAG = 0xB021;
var SCL_TRACK_TAG = 0xB022;
var MORPH_TRACK_TAG = 0xB026;
var FOV_TRACK_TAG = 0xB023;
var ROLL_TRACK_TAG = 0xB024;
var HOT_TRACK_TAG = 0xB027;
var FALL_TRACK_TAG = 0xB028;
var HIDE_TRACK_TAG = 0xB029;
var POLY_2D = 0x5000;
var SHAPE_OK = 0x5010;
var SHAPE_NOT_OK = 0x5011;
var SHAPE_HOOK = 0x5020;
var PATH_3D = 0x6000;
var PATH_MATRIX = 0x6005;
var SHAPE_2D = 0x6010;
var M_SCALE = 0x6020;
var M_TWIST = 0x6030;
var M_TEETER = 0x6040;
var M_FIT = 0x6050;
var M_BEVEL = 0x6060;
var XZ_CURVE = 0x6070;
var YZ_CURVE = 0x6080;
var INTERPCT = 0x6090;
var DEFORM_LIMIT = 0x60A0;
var USE_CONTOUR = 0x6100;
var USE_TWEEN = 0x6110;
var USE_SCALE = 0x6120;
var USE_TWIST = 0x6130;
var USE_TEETER = 0x6140;
var USE_FIT = 0x6150;
var USE_BEVEL = 0x6160;
var DEFAULT_VIEW = 0x3000;
var VIEW_TOP = 0x3010;
var VIEW_BOTTOM = 0x3020;
var VIEW_LEFT = 0x3030;
var VIEW_RIGHT = 0x3040;
var VIEW_FRONT = 0x3050;
var VIEW_BACK = 0x3060;
var VIEW_USER = 0x3070;
var VIEW_CAMERA = 0x3080;
var VIEW_WINDOW = 0x3090;
var VIEWPORT_LAYOUT_OLD = 0x7000;
var VIEWPORT_DATA_OLD = 0x7010;
var VIEWPORT_LAYOUT = 0x7001;
var VIEWPORT_DATA = 0x7011;
var VIEWPORT_DATA_3 = 0x7012;
var VIEWPORT_SIZE = 0x7020;
var NETWORK_VIEW = 0x7030;







THREE.PointerLockControls = function ( camera ) {

	var scope = this;

	camera.rotation.set( 0, 0, 0 );

	var pitchObject = new THREE.Object3D();
	pitchObject.add( camera );

	var yawObject = new THREE.Object3D();
	yawObject.position.y = 0;
	yawObject.add( pitchObject );

	var PI_2 = Math.PI / 2;

	var onMouseMove = function ( event ) {

		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * 0.004;
		pitchObject.rotation.x -= movementY * 0.004;

		pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

	};

	this.dispose = function() {

		document.removeEventListener( 'mousemove', onMouseMove, false );

	};

	document.addEventListener( 'mousemove', onMouseMove, false );

	this.enabled = false;

	this.getObject = function () {

		return yawObject;

	};

	this.getDirection = function() {

		// assumes the camera itself is not rotated

		var direction = new THREE.Vector3( 0, 0, - 1 );
		var rotation = new THREE.Euler( 0, 0, 0, "YXZ" );

		return function( v ) {

			rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );

			v.copy( direction ).applyEuler( rotation );

			return v;

		};

	}();

};


export default THREE;
