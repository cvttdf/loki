# Loki Shell Integration for Fish
# Uses OSC 133 sequences to mark command boundaries for block output

# Guard against double-loading
set -q LOKI_SHELL_INTEGRATION; and exit 0
set -gx LOKI_SHELL_INTEGRATION 1

# OSC helper
function __loki_osc
    printf "\e]133;%s\a" $argv[1]
end

# Mark prompt start (called before each prompt)
function __loki_prompt --on-event fish_prompt
    set -l exit_code $status
    # Previous command finished
    __loki_osc "D;$exit_code"
    # New prompt starting
    __loki_osc "A"
end

# Mark command execution start
function __loki_preexec --on-event fish_preexec
    __loki_osc "B"
end

# Mark command execution end
function __loki_postexec --on-event fish_postexec
    __loki_osc "C"
end

# Initial prompt mark
__loki_osc "A"
