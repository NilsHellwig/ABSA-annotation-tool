import time, os
from main import predict_llm

import argparse

args = None

def main():
    parser = argparse.ArgumentParser(description="Evaluation Script")
    parser.add_argument("--task", type=str, required=True, help="Task name, z.B. acd, asqp, etc.")
    parser.add_argument("--llm", type=str, required=True, help="LLM model to use, z.B. gemma3:4b, gemma3:7b, gpt-3.5-turbo, gpt-4")
    parser.add_argument("--pool_size", type=float, default=0.2, help="Proportion of training data to use as pool, e.g., 0.2 for 20%")
    global args
    args = parser.parse_args()

    print(f"Gewählter Task: {args.task}")

if __name__ == "__main__":
    main()


task = args.task  # "asqp", "acd", "tasd"

print("Pool size (type):", type(args.pool_size))
print("Pool size:", args.pool_size)
print("LLM (type):", type(args.llm))
print("LLM:", args.llm)
print("Task (type):", type(args.task))
print("Task:", args.task)

if task == "asqp":
   considered_sentiment_elements=["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]
elif task == "acd":
    considered_sentiment_elements=["aspect_category"]
elif task == "tasd":
    considered_sentiment_elements=["aspect_term", "aspect_category", "sentiment_polarity"]

def load_data(dataset_name, split, task):
    examples = []
    task_str = f"tasd" if task in ['tasd', 'acd', 'e2e'] else task
    with open(f"evaluation/data/{task_str}/{dataset_name}/{split}.txt", "r", encoding="utf-8") as f:
        for line in f:
            text, aspect_str = line.strip().split("####")
            aspect_list = eval(aspect_str)  # besser wäre ast.literal_eval
            
            if considered_sentiment_elements == ["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]:
                aspect_list = [
                    {
                        "aspect_term": aspect[0],
                        "aspect_category": aspect[1],
                        "sentiment_polarity": aspect[2],
                        "opinion_term": aspect[3]
                    }
                    for aspect in aspect_list
                ]
            elif considered_sentiment_elements == ["aspect_category"]:
                aspect_list = [
                    {
                        "aspect_category": aspect[1]
                    }
                    for aspect in aspect_list
                ]
                # remove duplicates in aspect_list
                aspect_list = [dict(t) for t in {tuple(d.items()) for d in aspect_list}]
            elif considered_sentiment_elements == ["aspect_term", "aspect_category", "sentiment_polarity"]:
                aspect_list = [
                    {
                        "aspect_term": aspect[0],
                        "aspect_category": aspect[1],
                        "sentiment_polarity": aspect[2]
                    }
                    for aspect in aspect_list
                ]

            examples.append({
                "text": text,
                "label": aspect_list
            })
    return examples

if task == "asqp":
   allow_implicit_aspect_terms = True
   allow_implicit_opinion_terms = False
elif task == "acd":
    allow_implicit_aspect_terms = False
    allow_implicit_opinion_terms = False
elif task == "tasd":
    allow_implicit_aspect_terms = True
    allow_implicit_opinion_terms = False
    
llm = args.llm
n_few_shot = 10
pool_size = args.pool_size  # 0.2 means 20% of training data as pool
train_data = load_data("rest16", "train", task)
test_data = load_data("rest16", "test", task)
pool = train_data[:int(len(train_data)*pool_size)]

# see list of unique aspect categories. ac is in example["label"][tuple_idx][1]
try:
    ac_set = set()
    for example in train_data + test_data:
        for tuple_idx in range(len(example["label"])):
            ac_set.add(example["label"][tuple_idx]["aspect_category"])
    unique_aspect_categories = list(ac_set)
except KeyError:
    unique_aspect_categories = []


try:    
    pol_set = set()
    for example in train_data + test_data:
        for tuple_idx in range(len(example["label"])):
            pol_set.add(example["label"][tuple_idx]["sentiment_polarity"])
    unique_polarities = list(pol_set)
except KeyError:
    unique_polarities = []

print(unique_aspect_categories)
print(unique_polarities)

predictions = []


for idx, example in enumerate(test_data):
    text = example['text']
    
    duration = time.time()

    llm_output= predict_llm(
        text,
        considered_sentiment_elements=considered_sentiment_elements,
        examples=pool,
        aspect_categories=unique_aspect_categories,
        polarities=unique_polarities,
        allow_implicit_aspect_terms=allow_implicit_aspect_terms,
        allow_implicit_opinion_terms=allow_implicit_opinion_terms,
        n_few_shot=n_few_shot,
        llm_model=llm)[0]
    
    print(f"Evaluating example {idx+1}/{len(test_data)}: {text}", llm_output, f"took {time.time()-duration:.2f}s", "Gold standard:", example['label'])
    
    try:
      aspects_out = llm_output["aspects"]
    except:
      aspects_out = []

    predictions.append({"text": text, "predicted": aspects_out, "time": time.time()-duration, "gold": example['label']})

# store predictions in /evaluation/predictions/{task}/{llm}/{pool_size}/predictions.json

# create directory if it does not exist
os.makedirs(f"evaluation/predictions/{task}/{llm.replace(':', '_')}/{pool_size}", exist_ok=True)

# save predictions
import json
with open(f"evaluation/predictions/{task}/{llm.replace(':', '_')}/{pool_size}/predictions.json", "w", encoding="utf-8") as f:
    json.dump(predictions, f, ensure_ascii=False, indent=4)