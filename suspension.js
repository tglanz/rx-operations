const { Subject } = require('rxjs');

const createSuspension = () => {
    const tasks = new Subject();
    const finished = new Subject();

    let isExecuting = false;
    let lastTask = null;

    tasks.switchMap(async task => {
        if (isExecuting){
            lastTask = task;
            return;
        }
            
        isExecuting = true;

        let result = await task();
        finished.next(result);

        while (lastTask != null){
            const toRun = lastTask;
            lastTask = null;
            result = await toRun();
            finished.next(result);
        }
    })
    .publish()
    .connect();

    return {
        insertTask: task => tasks.next(task),
        finishedTasks: finished
    }
}

async function suspensionExample(){
    const suspension = createSuspension();
    const delay = async timeout => new Promise(resolve => setTimeout(resolve, timeout));

    const newTask = (timeout, value) => async () => {
        console.log("Starting", value)
        await delay(timeout);
        return value;
    }

    suspension.finishedTasks.subscribe(
        result => console.log("Finished", result),
        error => console.error(error),
        () => console.log("Completed")
    );

    const start = new Date().getTime();
    let idx = 0;

    while (new Date().getTime() - start < 15000){
        suspension.insertTask(newTask(1000, idx++));
        await delay(500);
    }
}

suspensionExample()
    .then(() => console.log("Started"))
    .catch(error => console.error(error))