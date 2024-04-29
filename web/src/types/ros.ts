export type ColorRGBA = {
    R: number
    G: number
    B: number
    A: number
}

export type Joy = {
    /*
    Axes        []float32
	Buttons     []int32
     */
    Axes?: number[]
    Buttons?: number[]
}

export type Marker = {
    /*
    Header                   std_msgs.Header
	Ns                       string
	Id                       int32
	Type                     int32
	Action                   int32
	Pose                     geometry_msgs.Pose
	Scale                    geometry_msgs.Vector3
	Color                    std_msgs.ColorRGBA
	Lifetime                 time.Duration
	FrameLocked              bool
	Points                   []geometry_msgs.Point
	Colors                   []std_msgs.ColorRGBA
	Text                     string
	MeshResource             string
	MeshUseEmbeddedMaterials bool
     */
    Ns: string
    Id: number
    Type: number
    Action: number
    Pose: Pose
    Scale: Vector3
    Color: ColorRGBA
    Lifetime: number
    FrameLocked: boolean
    Points: Point[]
    Colors: ColorRGBA[]
    Text: string
    MeshResource: string
    MeshUseEmbeddedMaterials: boolean
}

export type PoseStamped = {
    /*
    	Pose        Pose
     */
    Pose?: Pose
}

export type Path = {
    /*
    	Poses       []geometry_msgs.PoseStamped

     */
    Poses?: PoseStamped[]
}

export type MarkerArray = {
    Markers: Marker[]
}

export type Point32 = {
    /*
    X           float32
	Y           float32
	Z           float32
     */
    X?: number
    Y?: number
    Z?: number
}

export type Twist = {
    Linear?: Vector3
    Angular?: Vector3
}

export type Polygon = {
    /*
    Points      []Point32
     */
    Points?: Point32[]
}

export type MapArea = {
    /*
     Name string
    Area geometry_msgs.Polygon
    Obstacles []geometry_msgs.Polygon
     */
    Name?: string
    Area?: Polygon
    Obstacles?: Polygon[]
}

export type Map = {
    /*
        MapWidth float64`rosname:"mapWidth"`
    MapHeight float64`rosname:"mapHeight"`
    MapCenterX float64`rosname:"mapCenterX"`
    MapCenterY float64        `rosname:"mapCenterY"`
    NavigationAreas []MapArea `rosname:"navigationAreas"`
    WorkingArea []MapArea     `rosname:"workingArea"`
    DockX float64             `rosname:"dockX"`
    DockY float64`rosname:"dockY"`
    DockHeading float64`rosname:"dockHeading"`
     */
    MapWidth?: number
    MapHeight?: number
    MapCenterX?: number
    MapCenterY?: number
    NavigationAreas?: MapArea[]
    WorkingArea?: MapArea[]
    DockX?: number
    DockY?: number
    DockHeading?: number
}

export type WheelTick = {
    /*
    WheelTickFactor  uint32
	ValidWheels      uint8
	WheelDirectionFl uint8
	WheelTicksFl     uint32
	WheelDirectionFr uint8
	WheelTicksFr     uint32
	WheelDirectionRl uint8
	WheelTicksRl     uint32
	WheelDirectionRr uint8
	WheelTicksRr     uint32
     */
    WheelTickFactor?: number
    ValidWheels?: number
    WheelDirectionFl?: number
    WheelTicksFl?: number
    WheelDirectionFr?: number
    WheelTicksFr?: number
    WheelDirectionRl?: number
    WheelTicksRl?: number
    WheelDirectionRr?: number
    WheelTicksRr?: number
}

export type Status = {
    MowerStatus?: number
    RaspberryPiPower?: boolean
    GpsPower?: boolean
    EscPower?: boolean
    RainDetected?: boolean
    SoundModuleAvailable?: boolean
    SoundModuleBusy?: boolean
    UiBoardAvailable?: boolean
    UltrasonicRanges?: [number, number, number, number, number]
    Emergency?: boolean
    VCharge?: number
    VBattery?: number
    ChargeCurrent?: number
    LeftEscStatus?: ESCStatus
    RightEscStatus?: ESCStatus
    MowEscStatus?: ESCStatus
}

export type ESCStatus = {
    Status?: string
    Current?: number
    Tacho?: number
    TemperatureMotor?: number
    TemperaturePcb?: number
}

export type Point = {
    /*
    X           float64
	Y           float64
	Z           float64
     */
    X?: number
    Y?: number
    Z?: number
}

export type Quaternion = {
    /*
    X           float64
	Y           float64
	Z           float64
	W           float64
     */
    X?: number
    Y?: number
    Z?: number
    W?: number
}

export type Pose = {
    /*
    Position    Point
	Orientation Quaternion
     */
    Position?: Point
    Orientation?: Quaternion
}

export type PoseWithCovariance = {
    /*
    Pose        Pose
	Covariance  [36]float64
     */
    Pose?: Pose
    Covariance?: number[]
}

export type Vector3 = {
    /*
    X           float64
	Y           float64
	Z           float64
     */
    X?: number
    Y?: number
    Z?: number
}

export type HighLevelStatus = {
    /*
    State             uint8
	StateName         string
	SubStateName      string
	GpsQualityPercent float32
	BatteryPercent    float32
	IsCharging        bool
	Emergency         bool
     */
    State?: number
    StateName?: string
    SubStateName?: string
    GpsQualityPercent?: number
    BatteryPercent?: number
    IsCharging?: boolean
    Emergency?: boolean
}

export const enum AbsolutePoseFlags {
    RTK = 1,
    FIXED = 2,
    FLOAT = 4,
    DEAD_RECKONING = 8,
}

export type AbsolutePose = {
    /*
        SensorStamp uint32
        ReceivedStamp uint32
        Source uint8
        Flags uint16
        OrientationValid uint8
        MotionVectorValid uint8
        PositionAccuracy float32
        OrientationAccuracy float32
        Pose geometry_msgs.PoseWithCovariance
        MotionVector geometry_msgs.Vector3
        VehicleHeading float64
        MotionHeading float64
     */
    SensorStamp?: number
    ReceivedStamp?: number
    Source?: number
    Flags?: AbsolutePoseFlags
    OrientationValid?: number
    MotionVectorValid?: number
    PositionAccuracy?: number
    OrientationAccuracy?: number
    Pose?: PoseWithCovariance
    MotionVector?: Vector3
    VehicleHeading?: number
    MotionHeading?: number
}

export type Imu = {
    /*
    	Orientation                  geometry_msgs.Quaternion
	OrientationCovariance        [9]float64
	AngularVelocity              geometry_msgs.Vector3
	AngularVelocityCovariance    [9]float64
	LinearAcceleration           geometry_msgs.Vector3
	LinearAccelerationCovariance [9]float64
     */
    Orientation?: Quaternion
    OrientationCovariance?: number[]
    AngularVelocity?: Vector3
    AngularVelocityCovariance?: number[]
    LinearAcceleration?: Vector3
    LinearAccelerationCovariance?: number[]
}
