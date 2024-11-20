Genere una nueva parte para esto que hace uno con un borrego y un perrito


curl 34.16.150.55:3000


![image](https://github.com/Aaron3312/CurlParrot_perrito/assets/133801416/eb92067b-3ff6-4987-ab2b-707cc13a45fc)
# 🐕 Terminal Dog

Bring an adorable animated ASCII dog to your terminal! Watch as this good boy wags, pants, and brings joy to your command line.

## Installing

### Either grab a build on the releases page or clone and run...
```
$ go get -u github.com/yourusername/terminal-dog
$ terminal-dog
```

### Nix
nix-env
```
nix-env -i terminal-dog
```

nix-profile
```
nix profile install nixpkgs#terminal-dog
```

### Homebrew
There is a tap for this as well, it's `yourusername/dog`
```
brew tap yourusername/dog
brew install terminal-dog
```

The command will be installed as `dog`, rather than `terminal-dog`.

### Snap
Install
```
$ sudo snap install terminal-dog
```

### Docker
The image is available on docker hub
```
docker pull yourusername/terminal-dog
docker run -it --rm yourusername/terminal-dog:latest
```

You can also build a docker image locally and run it in a container with...
```
docker build -t goodboy ./
docker run -it --rm goodboy (-args)
```

## Controls
- Hit the escape or "q" key to quit.
- `-loops`: You can limit your dog's energy with the `-loops` flag.
- 🏃 Set the frame delay with the `-delay` flag (defaults to 75, use 25 for zoomies mode!)
- `-mood`: Choose different dog moods: `happy` (default), `sleepy`, `excited`

## Adding Animations
You can add additional animations without re-compiling by adding a plain text file somewhere on the path (by default `/etc/terminal-dog` or `/opt/homebrew/etc/terminal-dog`).

This file should contain the frames, separated by lines containing `!--FRAME--!`. The filename must end with `.animation`.

The first segment of the file is reserved for metadata, which is key-value pairs separated by `:`. For example, the following file, named `fetch.animation` would add a new animation called `fetch`:

```
description: A dog playing fetch!
!--FRAME--!
    ∪･ω･∪
     /|__/|
    (    )
!--FRAME--!
   ∪･ω･∪  o
    /|__/|
   (    )
!--FRAME--!
∪･ω･∪     o
 /|__/|
(    )
```

Then you can run `terminal-dog fetch` to see your new animation (assuming it's on the path).

## Contributing
All good boys and girls are welcome to contribute! Feel free to submit pull requests with new animations, features, or bug fixes.
