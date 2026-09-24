import validateInput from "./validate-input.js";

// test('something', () => {
//
//
//     expect(1).toBe(1);
// });

test('happy path', () => {
    const input = {
        destinationId: '5589afa5-7f7e-4e31-86f4-102118e5d4a8',
        code: '123456'
    }

    expect(validateInput(input).isValid).toBe(true);
});

test('missing destinationId', () => {
    const input = {
        code: '123456'
    }

    expect(validateInput(input).isValid).toBe(false);
});

test('wrong format for uuid of destinationId', () => {
    const input = {
        destinationId: 'jejhdue',
        code: '123456'
    }

    expect(validateInput(input).isValid).toBe(false);
});


test('missing code', () => {
    const input = {
        destinationId: '5589afa5-7f7e-4e31-86f4-102118e5d4a8',
    }

    expect(validateInput(input).isValid).toBe(false);
});

test('wrong code format', () => {
    const input = {
        destinationId: '5589afa5-7f7e-4e31-86f4-102118e5d4a8',
        code: '123'
    }

    expect(validateInput(input).isValid).toBe(false);
});

test('missing both', () => {
    const input = {

    }

    expect(validateInput(input).isValid).toBe(false);
});


test('extra prop', () => {
    const input = {
        destinationId: '5589afa5-7f7e-4e31-86f4-102118e5d4a8',
        code: '123456',
        extra: '34'
    }

    expect(validateInput(input).isValid).toBe(false);
});