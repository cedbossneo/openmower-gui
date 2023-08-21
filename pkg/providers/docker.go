package providers

import (
	"context"
	"errors"
	types2 "github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/docker/docker/api/types"
	docker "github.com/docker/docker/client"
	"github.com/sirupsen/logrus"
	"golang.org/x/xerrors"
	"io"
)

type DockerProvider struct {
	client *docker.Client
}

func (i *DockerProvider) ContainerUpgrade(ctx context.Context, containerID string) error {
	if i.client == nil {
		return errors.New("docker client is not initialized")
	}
	// Get the container image hash
	container, err := i.client.ContainerInspect(ctx, containerID)
	if err != nil {
		return xerrors.Errorf("failed to inspect container: %w", err)
	}
	// Recreate container with the new image
	//Rename old container
	err = i.client.ContainerRemove(ctx, container.ID, types.ContainerRemoveOptions{
		Force: true,
	})
	newContainer, err := i.client.ContainerCreate(ctx, container.Config, container.HostConfig, nil, nil, container.Name)
	if err != nil {
		return xerrors.Errorf("failed to create container: %w", err)
	}
	// Start new container
	err = i.client.ContainerStart(ctx, newContainer.ID, types.ContainerStartOptions{})
	if err != nil {
		return xerrors.Errorf("failed to remove container: %w", err)
	}
	return nil
}

func (i *DockerProvider) ImageUpdateCheck(ctx context.Context, containerID string) (bool, error) {
	if i.client == nil {
		return false, errors.New("docker client is not initialized")
	}
	// Get the container image hash
	container, err := i.client.ContainerInspect(ctx, containerID)
	if err != nil {
		return false, xerrors.Errorf("failed to inspect container: %w", err)
	}
	// Get the container image
	image, _, err := i.client.ImageInspectWithRaw(ctx, container.Image)
	if err != nil {
		return false, xerrors.Errorf("failed to inspect image: %w", err)
	}

	// Get image digest from docker registry and compare it with the current image
	imageTag := image.RepoTags[0]
	if imageTag == "<none>:<none>" {
		return false, errors.New("image tag is <none>:<none>")
	}
	pull, err := i.client.ImagePull(ctx, imageTag, types.ImagePullOptions{
		Platform: image.Os + "/" + image.Architecture,
	})
	if err != nil {
		return false, xerrors.Errorf("failed to pull image: %w", err)
	}
	defer pull.Close()
	io.Copy(io.Discard, pull)
	// Check if the pulled image has the same digest as the current image
	pullDigest, _, err := i.client.ImageInspectWithRaw(ctx, imageTag)
	if err != nil {
		return false, xerrors.Errorf("failed to inspect image: %w", err)
	}
	if pullDigest.ID != image.ID {
		return true, nil
	}
	return false, nil
}

func NewDockerProvider() types2.IDockerProvider {
	client, err := docker.NewClientWithOpts(docker.FromEnv)
	if err != nil {
		logrus.Error(err)
	}
	return &DockerProvider{client: client}
}

func (i *DockerProvider) ContainerList(ctx context.Context) ([]types.Container, error) {
	if i.client == nil {
		return nil, errors.New("docker client is not initialized")
	}
	return i.client.ContainerList(ctx, types.ContainerListOptions{
		All: true,
	})
}

func (i *DockerProvider) ContainerLogs(ctx context.Context, containerID string) (io.ReadCloser, error) {
	if i.client == nil {
		return nil, errors.New("docker client is not initialized")
	}
	return i.client.ContainerLogs(ctx, containerID, types.ContainerLogsOptions{ShowStdout: true, ShowStderr: true, Follow: true, Tail: "100"})
}

func (i *DockerProvider) ContainerStart(ctx context.Context, containerID string) error {
	if i.client == nil {
		return errors.New("docker client is not initialized")
	}
	return i.client.ContainerStart(ctx, containerID, types.ContainerStartOptions{})
}

func (i *DockerProvider) ContainerStop(ctx context.Context, containerID string) error {
	if i.client == nil {
		return errors.New("docker client is not initialized")
	}
	return i.client.ContainerStop(ctx, containerID, nil)
}

func (i *DockerProvider) ContainerRestart(ctx context.Context, containerID string) error {
	return i.client.ContainerRestart(ctx, containerID, nil)
}
