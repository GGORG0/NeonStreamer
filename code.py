import os
import socket
import ssl
import time
import board
import displayio
import framebufferio
import rgbmatrix
import adafruit_minimqtt.adafruit_minimqtt as MQTT

mqtt_broker = "YOUR.BROKER.TLD"
mqtt_topic = "frame"


# Set up the display
displayio.release_displays()

fbuf = bytearray(64 * 32 * 2)

matrix = rgbmatrix.RGBMatrix(
    width=64, height=32, bit_depth=1,
    rgb_pins=[board.D6, board.D5, board.D9, board.D11, board.D10, board.D12],
    addr_pins=[board.A5, board.A4, board.A3, board.A2],
    clock_pin=board.D13, latch_pin=board.D0, output_enable_pin=board.D1)

display = framebufferio.FramebufferDisplay(matrix, auto_refresh=False)


def show_frame(frame_data):
    bitmap = displayio.Bitmap(64, 32, 65535)
    palette = displayio.Palette(65535)
    
    for i in range(65535):
        r = ((i >> 11) & 0x1F) << 3
        g = ((i >> 5) & 0x3F) << 2
        b = (i & 0x1F) << 3
        palette[i] = (r << 16) | (g << 8) | b
    
    for y in range(32):
        row_offset = y * 64
        for x in range(64):
            pixel_offset = (x + row_offset) * 2
            color = frame_data[pixel_offset] | (frame_data[pixel_offset + 1] << 8)

            # workaround: we can't show pure white, because the palette is 1 color too small :(
            if color == 65535:
                color = 65534
            
            bitmap[x, y] = color
    
    tile_grid = displayio.TileGrid(bitmap, pixel_shader=palette)
    group = displayio.Group()
    group.append(tile_grid)
    display.root_group = group


def connect(mqtt_client, userdata, flags, rc):
    print("Connected to MQTT Broker!")
    print(f"Flags: {flags}\n RC: {rc}")


def disconnect(mqtt_client, userdata, rc):
    print("Disconnected from MQTT Broker!")


def subscribe(mqtt_client, userdata, topic, granted_qos):
    print(f"Subscribed to {topic} with QOS level {granted_qos}")


def unsubscribe(mqtt_client, userdata, topic, pid):
    print(f"Unsubscribed from {topic} with PID {pid}")


def message(client, topic, message):
    show_frame(message)
    display.refresh(minimum_frames_per_second=0)


# Set up MQTT
mqtt_client = MQTT.MQTT(
    broker=mqtt_broker,
    socket_pool=socket,
    ssl_context=ssl.create_default_context(),
    use_binary_mode=True,
)

mqtt_client.on_connect = connect
mqtt_client.on_disconnect = disconnect
mqtt_client.on_subscribe = subscribe
mqtt_client.on_unsubscribe = unsubscribe
mqtt_client.on_message = message

print("Attempting to connect to %s" % mqtt_client.broker)
mqtt_client.connect()

print("Subscribing to %s" % mqtt_topic)
mqtt_client.subscribe(mqtt_topic)

while True:
    mqtt_client.loop(timeout=1)