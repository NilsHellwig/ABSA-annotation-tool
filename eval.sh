tasks=("acd" "asqp" "tasd")
pool_sizes=("0.1" "0.2" "0.3" "0.4" "0.5" "0.6" "0.7" "0.8" "0.9" "1.0")
for task in "${tasks[@]}"; do
    for pool_size in "${pool_sizes[@]}"; do
        python eval.py --task $task --pool_size $pool_size --llm gemma3:4b
    done
done