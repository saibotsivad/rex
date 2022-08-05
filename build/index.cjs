'use strict';

var node_child_process = require('node:child_process');
var node_fs = require('node:fs');
var path = require('node:path');
var timers = require('node:timers/promises');
var AWS = require('aws-sdk');
var os = require('node:os');
var process$1 = require('node:process');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var timers__default = /*#__PURE__*/_interopDefaultLegacy(timers);
var AWS__default = /*#__PURE__*/_interopDefaultLegacy(AWS);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);
var process__default = /*#__PURE__*/_interopDefaultLegacy(process$1);

const endSymbol = Symbol('pForever.end');

const pForever = async (function_, previousValue) => {
	const newValue = await function_(await previousValue);

	if (newValue === endSymbol) {
		return;
	}

	return pForever(function_, newValue);
};

pForever.end = endSymbol;

function toArr(any) {
	return any == null ? [] : Array.isArray(any) ? any : [any];
}

function toVal(out, key, val, opts) {
	var x, old=out[key], nxt=(
		!!~opts.string.indexOf(key) ? (val == null || val === true ? '' : String(val))
		: typeof val === 'boolean' ? val
		: !!~opts.boolean.indexOf(key) ? (val === 'false' ? false : val === 'true' || (out._.push((x = +val,x * 0 === 0) ? x : val),!!val))
		: (x = +val,x * 0 === 0) ? x : val
	);
	out[key] = old == null ? nxt : (Array.isArray(old) ? old.concat(nxt) : [old, nxt]);
}

function e (args, opts) {
	args = args || [];
	opts = opts || {};

	var k, arr, arg, name, val, out={ _:[] };
	var i=0, j=0, idx=0, len=args.length;

	const alibi = opts.alias !== void 0;
	const strict = opts.unknown !== void 0;
	const defaults = opts.default !== void 0;

	opts.alias = opts.alias || {};
	opts.string = toArr(opts.string);
	opts.boolean = toArr(opts.boolean);

	if (alibi) {
		for (k in opts.alias) {
			arr = opts.alias[k] = toArr(opts.alias[k]);
			for (i=0; i < arr.length; i++) {
				(opts.alias[arr[i]] = arr.concat(k)).splice(i, 1);
			}
		}
	}

	for (i=opts.boolean.length; i-- > 0;) {
		arr = opts.alias[opts.boolean[i]] || [];
		for (j=arr.length; j-- > 0;) opts.boolean.push(arr[j]);
	}

	for (i=opts.string.length; i-- > 0;) {
		arr = opts.alias[opts.string[i]] || [];
		for (j=arr.length; j-- > 0;) opts.string.push(arr[j]);
	}

	if (defaults) {
		for (k in opts.default) {
			name = typeof opts.default[k];
			arr = opts.alias[k] = opts.alias[k] || [];
			if (opts[name] !== void 0) {
				opts[name].push(k);
				for (i=0; i < arr.length; i++) {
					opts[name].push(arr[i]);
				}
			}
		}
	}

	const keys = strict ? Object.keys(opts.alias) : [];

	for (i=0; i < len; i++) {
		arg = args[i];

		if (arg === '--') {
			out._ = out._.concat(args.slice(++i));
			break;
		}

		for (j=0; j < arg.length; j++) {
			if (arg.charCodeAt(j) !== 45) break; // "-"
		}

		if (j === 0) {
			out._.push(arg);
		} else if (arg.substring(j, j + 3) === 'no-') {
			name = arg.substring(j + 3);
			if (strict && !~keys.indexOf(name)) {
				return opts.unknown(arg);
			}
			out[name] = false;
		} else {
			for (idx=j+1; idx < arg.length; idx++) {
				if (arg.charCodeAt(idx) === 61) break; // "="
			}

			name = arg.substring(j, idx);
			val = arg.substring(++idx) || (i+1 === len || (''+args[i+1]).charCodeAt(0) === 45 || args[++i]);
			arr = (j === 2 ? [name] : name);

			for (idx=0; idx < arr.length; idx++) {
				name = arr[idx];
				if (strict && !~keys.indexOf(name)) return opts.unknown('-'.repeat(j) + name);
				toVal(out, name, (idx + 1 < arr.length) || val, opts);
			}
		}
	}

	if (defaults) {
		for (k in opts.default) {
			if (out[k] === void 0) {
				out[k] = opts.default[k];
			}
		}
	}

	if (alibi) {
		for (k in out) {
			arr = opts.alias[k] || [];
			while (arr.length > 0) {
				out[arr.shift()] = out[k];
			}
		}
	}

	return out;
}

const t="__all__",i="__default__",s="\n";function r(e){if(!e.length)return "";let t=function(e){let t=0,i=0,s=0,r=e.length;if(r)for(;r--;)i=e[r].length,i>t&&(s=r,t=i);return e[s].length}(e.map(e=>e[0]))+4;return e.map(e=>e[0]+" ".repeat(t-e[0].length)+e[1]+(null==e[2]?"":`  (default ${e[2]})`))}function n(e){return e}function l(e,t,i){if(!t||!t.length)return "";let r=0,n="";for(n+="\n  "+e;r<t.length;r++)n+="\n    "+i(t[r]);return n+s}function a(e,t,i=1){let s=l("ERROR",[t],n);s+=`\n  Run \`$ ${e} --help\` for more info.\n`,console.error(s),process.exit(i);}class o{constructor(e,s){let[r,...n]=e.split(/\s+/);s=s||n.length>0,this.bin=r,this.ver="0.0.0",this.default="",this.tree={},this.command(t),this.command([i].concat(s?n:"<command>").join(" ")),this.single=s,this.curr="";}command(e,t,i={}){if(this.single)throw new Error('Disable "single" mode to add commands');let s=[],r=[],n=/(\[|<)/;if(e.split(/\s+/).forEach(e=>{(n.test(e.charAt(0))?r:s).push(e);}),s=s.join(" "),s in this.tree)throw new Error("Command already exists: "+s);return s.includes("__")||r.unshift(s),r=r.join(" "),this.curr=s,i.default&&(this.default=s),this.tree[s]={usage:r,alibi:[],options:[],alias:{},default:{},examples:[]},i.alias&&this.alias(i.alias),t&&this.describe(t),this}describe(e){return this.tree[this.curr||i].describe=Array.isArray(e)?e:function(e){return (e||"").replace(/([.?!])\s*(?=[A-Z])/g,"$1|").split("|")}(e),this}alias(...e){if(this.single)throw new Error('Cannot call `alias()` in "single" mode');if(!this.curr)throw new Error("Cannot call `alias()` before defining a command");return (this.tree[this.curr].alibi=this.tree[this.curr].alibi.concat(...e)).forEach(e=>this.tree[e]=this.curr),this}option(e,i,s){let r=this.tree[this.curr||t],[n,l]=function(e){return (e||"").split(/^-{1,2}|,|\s+-{1,2}|\s+/).filter(Boolean)}(e);if(l&&l.length>1&&([n,l]=[l,n]),e="--"+n,l&&l.length>0){e=`-${l}, ${e}`;let t=r.alias[l];r.alias[l]=(t||[]).concat(n);}let a=[e,i||""];return void 0!==s?(a.push(s),r.default[n]=s):l||(r.default[n]=void 0),r.options.push(a),this}action(e){return this.tree[this.curr||i].handler=e,this}example(e){return this.tree[this.curr||i].examples.push(e),this}version(e){return this.ver=e,this}parse(s,r={}){s=s.slice();let n,l,o,h,u=2,f=e(s.slice(u),{alias:{h:"help",v:"version"}}),c=this.single,p=this.bin,d="";if(c)h=this.tree[i];else {let e,t=1,i=f._.length+1;for(;t<i;t++)if(n=f._.slice(0,t).join(" "),e=this.tree[n],"string"==typeof e)l=(d=e).split(" "),s.splice(s.indexOf(f._[0]),t,...l),t+=l.length-t;else if(e)d=n;else if(d)break;if(h=this.tree[d],o=void 0===h,o)if(this.default)d=this.default,h=this.tree[d],s.unshift(d),u++;else if(n)return a(p,"Invalid command: "+n)}if(f.help)return this.help(!c&&!o&&d);if(f.version)return this._version();if(!c&&void 0===h)return a(p,"No command specified.");let g=this.tree[t];r.alias=Object.assign(g.alias,h.alias,r.alias),r.default=Object.assign(g.default,h.default,r.default),n=d.split(" "),l=s.indexOf(n[0],2),~l&&s.splice(l,n.length);let m=e(s.slice(u),r);if(!m||"string"==typeof m)return a(p,m||"Parsed unknown option flag(s)!");let b=h.usage.split(/\s+/),_=b.filter(e=>"<"===e.charAt(0)),v=m._.splice(0,_.length);if(v.length<_.length)return d&&(p+=" "+d),a(p,"Insufficient arguments!");b.filter(e=>"["===e.charAt(0)).forEach(e=>{v.push(m._.shift());}),v.push(m);let $=h.handler;return r.lazy?{args:v,name:d,handler:$}:$.apply(null,v)}help(e){console.log(function(e,a,o,h){let u="",f=a[o],c="$ "+e,p=a[t],d=e=>`${c} ${e}`.replace(/\s+/g," "),g=[["-h, --help","Displays this message"]];if(o===i&&g.unshift(["-v, --version","Displays current version"]),f.options=(f.options||[]).concat(p.options,g),f.options.length>0&&(f.usage+=" [options]"),u+=l("Description",f.describe,n),u+=l("Usage",[f.usage],d),h||o!==i)h||o===i||(u+=l("Aliases",f.alibi,d));else {let e,t=/^__/,i="",o=[];for(e in a)"string"==typeof a[e]||t.test(e)||o.push([e,(a[e].describe||[""])[0]])<3&&(i+=`\n    ${c} ${e} --help`);u+=l("Available Commands",r(o),n),u+="\n  For more info, run any command with the `--help` flag"+i+s;}return u+=l("Options",r(f.options),n),u+=l("Examples",f.examples.map(d),n),u}(this.bin,this.tree,e||i,this.single));}_version(){console.log(`${this.bin}, ${this.ver}`);}}var sade = (e,t)=>new o(e,t);

// based on https://stackoverflow.com/a/8809472/201789
var justUuid4 = () => {
	let d = Date.now();
	return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => {
		const r = (d + Math.random() * 16) % 16 | 0;
		d = Math.floor(d / 16);
		return (c == `x` ? r : (r & 0x3 | 0x8)).toString(16)
	})
};

function dlv(t,e,l,n,r){for(e=e.split?e.split("."):e,n=0;n<e.length;n++)t=t?t[e[n]]:r;return t===r?l:t}

function dset(obj, keys, val) {
	keys.split && (keys=keys.split('.'));
	var i=0, l=keys.length, t=obj, x, k;
	while (i < l) {
		k = keys[i++];
		if (k === '__proto__' || k === 'constructor' || k === 'prototype') break;
		t = t[k] = (i === l) ? val : (typeof(x=t[k])===typeof(keys)) ? x : (keys[i]*0 !== 0 || !!~(''+keys[i]).indexOf('.')) ? {} : [];
	}
}

const homedir = os__default["default"].homedir();
const tmpdir = os__default["default"].tmpdir();
const {env} = process__default["default"];

const macos = name => {
	const library = path__default["default"].join(homedir, 'Library');

	return {
		data: path__default["default"].join(library, 'Application Support', name),
		config: path__default["default"].join(library, 'Preferences', name),
		cache: path__default["default"].join(library, 'Caches', name),
		log: path__default["default"].join(library, 'Logs', name),
		temp: path__default["default"].join(tmpdir, name),
	};
};

const windows = name => {
	const appData = env.APPDATA || path__default["default"].join(homedir, 'AppData', 'Roaming');
	const localAppData = env.LOCALAPPDATA || path__default["default"].join(homedir, 'AppData', 'Local');

	return {
		// Data/config/cache/log are invented by me as Windows isn't opinionated about this
		data: path__default["default"].join(localAppData, name, 'Data'),
		config: path__default["default"].join(appData, name, 'Config'),
		cache: path__default["default"].join(localAppData, name, 'Cache'),
		log: path__default["default"].join(localAppData, name, 'Log'),
		temp: path__default["default"].join(tmpdir, name),
	};
};

// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
const linux = name => {
	const username = path__default["default"].basename(homedir);

	return {
		data: path__default["default"].join(env.XDG_DATA_HOME || path__default["default"].join(homedir, '.local', 'share'), name),
		config: path__default["default"].join(env.XDG_CONFIG_HOME || path__default["default"].join(homedir, '.config'), name),
		cache: path__default["default"].join(env.XDG_CACHE_HOME || path__default["default"].join(homedir, '.cache'), name),
		// https://wiki.debian.org/XDGBaseDirectorySpecification#state
		log: path__default["default"].join(env.XDG_STATE_HOME || path__default["default"].join(homedir, '.local', 'state'), name),
		temp: path__default["default"].join(tmpdir, username, name),
	};
};

function envPaths(name, {suffix = 'nodejs'} = {}) {
	if (typeof name !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof name}`);
	}

	if (suffix) {
		// Add suffix to prevent possible conflict with native apps
		name += `-${suffix}`;
	}

	if (process__default["default"].platform === 'darwin') {
		return macos(name);
	}

	if (process__default["default"].platform === 'win32') {
		return windows(name);
	}

	return linux(name);
}

const { config: configPath } = envPaths('rex');

const filepath = path.join(configPath, 'config.json');
const read = () => {
	try {
		return JSON.parse(node_fs.readFileSync(filepath, 'utf8'))
	} catch (error) {
		if (error.code === 'ENOENT') return {}
		else throw error
	}
};
const write = data => {
	node_fs.mkdirSync(configPath, { recursive: true });
	node_fs.writeFileSync(filepath, JSON.stringify(data, undefined, 4), 'utf8');
};

const config = {
	get: keypath => {
		const data = read();
		return dlv(data, keypath)
	},
	set: (keypath, value) => {
		const data = read();
		dset(data, keypath, value);
		write(data);
		return data
	},
	unset: keypath => {
		const data = read();
		dset(data, keypath, undefined);
		write(data);
		return data
	},
	path: () => filepath,
};

const version = '1.0.0';

const prog = sade('rex');

const COMMAND_REGEX = /[a-zA-Z0-9_-]/;
const SECONDS_DELAY_FOR_ERROR = 10;
const TEMP_FOLDER = '/tmp/remote-execute';

const delay = async millis => timers__default["default"].setTimeout(millis);

const assertCommandNameIsSafe = name => {
	if (!COMMAND_REGEX.test(name)) {
		console.log(`Allowed characters for command names are ${COMMAND_REGEX.toString()}`);
		process.exit(1);
	}
};

const execute = async (script, payloadPathFilename) => {
	node_child_process.execSync(`"${script}" "${payloadPathFilename}"`);
};

const exit = (status, message) => {
	if (message) {
		console.log(message);
	}
	process.exit(status);
};

const getSqsInstance = () => {
	const QueueUrl = config.get('sqsUrl');
	if (!QueueUrl) {
		exit(1, 'No SQS queue URL configured.');
	}

	let sqs;

	const region = process.env.REX_AWS_REGION;
	const accessKeyId = process.env.REX_AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.REX_AWS_SECRET_ACCESS_KEY;
	if (region || accessKeyId || secretAccessKey) {
		if (!region || !accessKeyId || !secretAccessKey) {
			exit(1, 'AWS credentials are not configured correctly.');
		}
		sqs = new AWS__default["default"].SQS({ region, accessKeyId, secretAccessKey });
	} else if (config.get('awsprofile')) {
		AWS__default["default"].config.credentials = new AWS__default["default"].SharedIniFileCredentials({
			profile: config.get('awsprofile')
		});
		sqs = new AWS__default["default"].SQS();
	} else {
		sqs = new AWS__default["default"].SQS();
	}

	return { QueueUrl, sqs }
};

const writePayload = message => {
	const hasPayload = message.Body
		&& message.MessageAttributes
		&& message.MessageAttributes.HasBody
		&& message.MessageAttributes.HasBody.StringValue === 'true';
	if (hasPayload) {
		const tempFolder = config.get('tempFolder') || TEMP_FOLDER;
		node_fs.mkdirSync(tempFolder, { recursive: true });
		const filename = path.join(tempFolder, `${new Date().getTime()}-${justUuid4()}`);
		node_fs.writeFileSync(filename, message.Body, { encoding: 'utf8' });
		return filename
	}
	return undefined
};

const watchQueue = async () => {
	try {
		const { QueueUrl, sqs } = getSqsInstance();
		const params = {
			QueueUrl,
			MaxNumberOfMessages: 1,
			AttributeNames: [ 'All' ],
			MessageAttributeNames: [ 'All' ],
			WaitTimeSeconds: 20
		};
		const data = await sqs.receiveMessage(params).promise();
		if (data.Messages && data.Messages.length) {
			const name = data.Messages[0].Attributes.MessageGroupId;
			const script = config.get(`commands.${name}`);

			if (!script) {
				console.error(`Received an unrecognized command: ${name}`);
			} else {
				const payloadPathFilename = writePayload(data.Messages[0]);
				try {
					await execute(script, payloadPathFilename);
					console.log(`Executed command successfully: ${name}`);
				} catch (error) {
					console.error(`Command execution failed: ${name}`);
				}

			}

			try {
				const ReceiptHandle = data.Messages[0].ReceiptHandle;
				await sqs.deleteMessage({ QueueUrl, ReceiptHandle }).promise();
			} catch (error) {
				console.error('Error while marking command as received.', error);
			}
		}
		console.log('');
	} catch (error) {
		console.error(`Unexpected error while fetching commands. Waiting ${SECONDS_DELAY_FOR_ERROR} seconds to retry.`, error);
		await delay(SECONDS_DELAY_FOR_ERROR * 1000);
	}
};

prog
	.version(version)
	.describe('Set up this computer to accept remote execution, using messages passed through AWS SQS. For more information, see: https://github.com/saibotsivad/remote-execute');

prog
	.command('config-path')
	.describe('Get the path to the configuration file.')
	.action(() => {
		console.log(config.path());
	});

prog
	.command('listen')
	.describe('Start listening for execution commands.')
	.action(() => {
		console.log('Listening for execution commands...');
		pForever(watchQueue)
			.then(() => {
				exit(0, 'Done watching for commands.');
			})
			.catch(error => {
				console.error(error);
				exit(1, 'An unrecoverable error occurred while watching for commands.');
			});
	});

prog
	.command('run <name> [payload]')
	.describe('Execute a command manually. Optionally, pass along a filepath to a payload.')
	.action((name, payload) => {
		assertCommandNameIsSafe(name);
		const script = config.get(`commands.${name}`);
		if (!script) {
			exit(1, `Could not locate command: ${name}`);
		}
		execute(script, payload)
			.then(() => {
				exit(0, `Executed command successfully: ${name}`);
			})
			.catch(error => {
				exit(1, `Command ececution failed: ${name}`);
			});
	});

prog
	.command('push <name> [payload]')
	.describe('Push a command through SQS. This will post an execution request to an SQS queue, which your service should detect and then execute. Optionally, pass along the path to the JSON payload.')
	.action((name, payload) => {
		assertCommandNameIsSafe(name);
		const { QueueUrl, sqs } = getSqsInstance();

		const message = {
			QueueUrl,
			MessageGroupId: name,
			MessageDeduplicationId: `${new Date().getTime()}-${justUuid4()}`,
			MessageAttributes: {
				HasBody: {
					DataType: 'String',
					StringValue: payload
						? 'true'
						: 'false'
				}
			}
		};

		if (payload) {
			try {
				message.MessageBody = node_fs.readFileSync(payload, { encoding: 'utf8' });
			} catch (ignore) {
				exit(1, `Could not read payload file: ${payload}`);
			}
		} else {
			message.MessageBody = name;
		}

		sqs.sendMessage(message, (error, data) => {
			if (error) {
				console.error(error);
				exit(1, `Failed to push to SQS queue: ${QueueUrl}`);
			} else {
				exit(0, `Successfully pushed to SQS queue: ${QueueUrl}`);
			}
		});
	});

prog
	.command('set awsprofile [name]')
	.describe(`Set an AWS credentials profile name. If 'name' is not set, it will remove the configured profile name.`)
	.action(name => {
		if (name) {
			config.set('awsprofile', name);
			exit(0, `AWS profile set: ${name}`);
		} else {
			config.unset('awsprofile');
			exit(0, `Removed AWS profile.`);
		}
	});

prog
	.command('set command <name> [script]')
	.describe(`Set an executable command. If not set, it will remove the registered command. Allowed characters are ${COMMAND_REGEX.toString()} start and end characters may not be dashes or underscores. When a request is received to execute this command, this service will execute <script> with an optional path to a temporary file containing any properties passed in with the execution request.`)
	.action((name, script) => {
		assertCommandNameIsSafe(name);
		if (script) {
			config.set(`commands.${name}`, script);
			exit(0, `Added command: ${name} => ${script}`);
		} else {
			config.unset(`commands.${name}`);
			exit(0, `Removed command: ${name}`);
		}
	});

prog
	.command('set sqs <url>')
	.describe(`Set the SQS queue URL. Queue URLs are case-sensitive.`)
	.action(url => {
		config.set('sqsUrl', url);
		exit(0, `Set SQS queue URL: "${url}"`);
	});

prog
	.command('set temp [folder]')
	.describe(`Set the folder to store payloads. Leave blank to revert to default: ${TEMP_FOLDER}`)
	.action(folder => {
		if (folder) {
			config.set('tempFolder', folder);
			exit(0, `Payload temporary folder set: ${folder}`);
		} else {
			config.unset('tempFolder');
			exit(0, `Payload temporary folder reverted to default: ${TEMP_FOLDER}`);
		}
	});

prog
	.command('get awsprofile')
	.describe('Get the SQS queue URL.')
	.action(() => {
		exit(0, config.get('awsprofile'));
	});

prog
	.command('get command [name]')
	.describe('List executable commands. If [name] is set, it will print only that command.')
	.action(name => {
		if (name) {
			assertCommandNameIsSafe(name);
			console.log(config.get(`commands.${name}`));
		} else {
			const commands = config.get('commands') || {};
			Object
				.keys(commands)
				.forEach(key => {
					console.log(`${key} => ${commands[key]}`);
				});
		}
	});

prog
	.command('get sqs')
	.describe('Get the SQS queue URL.')
	.action(() => {
		exit(0, config.get('sqsUrl'));
	});

prog
	.command('get temp')
	.describe('Get the folder used to store payloads.')
	.action(() => {
		exit(0, config.get('tempFolder'));
	});

prog.parse(process.argv);
