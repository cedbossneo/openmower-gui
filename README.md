# OpenMower GUI

A GUI for the OpenMower project.

## Demo

[https://youtu.be/x45rdy4czQ0](https://youtu.be/x45rdy4czQ0)

## Installation

### mowgli-docker

If you are using mowgli-docker, you can skip this part as it's now included in the docker-compose file.

### OpenMowerOS

OpenMowerOS uses podman and containers are managed by systemd.

Create a gui.service file in `/etc/systemd/system/` with the following content:

```bash
[Unit]
Description=Podman container - gui.service
Documentation=man:podman-generate-systemd(1)
Wants=network.target
After=network-online.target NetworkManager.service
StartLimitInterval=120
StartLimitBurst=10

[Service]
Environment=PODMAN_SYSTEMD_UNIT=%n
Type=forking
Restart=always
RestartSec=15s
TimeoutStartSec=1h
TimeoutStopSec=120s

ExecStartPre=/bin/rm -f %t/container-gui.pid %t/container-gui.ctr-id

ExecStart=/usr/bin/podman run --conmon-pidfile %t/container-gui.pid --cidfile %t/container-gui.ctr-id --cgroups=no-conmon \
  --replace --detach --tty --privileged \
  --name openmower-gui \
  --network=host \
  --env MOWER_CONFIG_FILE=/config/mower_config.sh \
  --env DOCKER_HOST=unix:///run/podman/podman.sock \
  --env ROS_MASTER_URI=http://localhost:11311 \
  --volume /dev:/dev \
  --volume /run/podman/podman.sock:/run/podman/podman.sock \
  --volume /boot/openmower/db:/app/db \
  --volume /boot/openmower/mower_config.txt:/config/mower_config.sh \
  --label io.containers.autoupdate=registry \
  ghcr.io/cedbossneo/openmower-gui:master

#ExecStartPost=/usr/bin/podman image prune --all --force

ExecStop=/usr/bin/podman stop --ignore --cidfile %t/container-gui.ctr-id -t 10
ExecStopPost=/usr/bin/podman rm --ignore --force --cidfile %t/container-gui.ctr-id
PIDFile=%t/container-gui.pid

[Install]
WantedBy=multi-user.target default.target
```

Then enable and start the service:

```bash
sudo systemctl enable gui.service
sudo systemctl start gui.service
```

### Docker-compose

Adjust the docker-compose file to your needs and run:

```bash
docker-compose up -d
```

## Usage

Once the container is running, you can access the GUI by opening a browser and going
to `http://<ip of the machine running the container>:4006`

### HomeKit

The password to use OpenMower in iOS home app is 00102003

### Env variables

- MOWER_CONFIG_FILE=mower_config.sh : config file location
- DOCKER_HOST=unix:///var/run/docker.sock : socker socket
- ROS_MASTER_URI=http://localhost:11311 : ros master uri
- ROS_NODE_NAME=openmower-gui : node name
- ROS_NODE_HOST=:4006 : listening port
- MAP_TILE_SERVER=http://localhost:5000 : custom map tile server (see https://github.com/2m/openmower-map-tiles for
  usage)
- MAP_TILE_URI=/tiles/vt/lyrs=s,h&x={x}&y={y}&z={z}
