#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
# Clone the repository https://github.com/ClemensElflein/open_mower_ros in a temporary directory
git clone https://github.com/ClemensElflein/open_mower_ros /tmp/open_mower_ros
cd /tmp/open_mower_ros/ && git submodule update --init --recursive
cd $SCRIPT_DIR
# Use msg-import to import the messages from the temporary directory
declare -a PACKAGES_NAME
declare -a PACKAGES_PATH

PACKAGES_NAME[0]="xbot_msgs"
PACKAGES_PATH[0]="src/lib/xbot_msgs/msg"
PACKAGES_NAME[1]="mower_msgs"
PACKAGES_PATH[1]="src/mower_msgs/msg"
PACKAGES_NAME[2]="mower_map"
PACKAGES_PATH[2]="src/mower_map/msg"

PACKAGES_NAME[3]="xbot_msgs"
PACKAGES_PATH[3]="src/lib/xbot_msgs/srv"
PACKAGES_NAME[4]="mower_msgs"
PACKAGES_PATH[4]="src/mower_msgs/srv"
PACKAGES_NAME[5]="mower_map"
PACKAGES_PATH[5]="src/mower_map/srv"
for pkg in $PACKAGES_NAME; do
  for file in $(ls /tmp/open_mower_ros/${PACKAGES_PATH[$pkg]}/*.msg); do
    echo "Importing message $file"
    filename=$(basename $file)
    filename="${filename%.*}"
    $GOPATH/bin/msg-import --rospackage=${PACKAGES_NAME[$pkg]} --gopackage=${PACKAGES_NAME[$pkg]} $file > pkg/msgs/${PACKAGES_NAME[$pkg]}/${filename}.go
  done
  for file in $(ls /tmp/open_mower_ros/${PACKAGES_PATH[$pkg]}/*.srv); do
    echo "Importing service $file"
    filename=$(basename $file)
    filename="${filename%.*}"
    $GOPATH/bin/srv-import --rospackage=${PACKAGES_NAME[$pkg]} --gopackage=${PACKAGES_NAME[$pkg]} $file > pkg/msgs/${PACKAGES_NAME[$pkg]}/${filename}.go
  done
done
