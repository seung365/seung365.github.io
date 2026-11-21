---
title: "[React] 렌더링 문제 (Map에서의 Key 설정)"
description: "알파메일이라는 사이트를 개발해 오면서 마이 페이지에서 API를 통해 가져오는 과정에서 렌더링이 이상하게 되는것이다."
published: 2024-08-16T09:43:53.109Z
updated: 2026-11-07T05:25:39.780Z
tags: ["React","trouble shooting"]
image: "https://velog.velcdn.com/images/seung365/post/e820b240-46a5-4b90-8861-b6fca6b3174d/image.svg"
---

알파메일이라는 사이트를 개발해 오면서 마이 페이지에서 API를 통해 가져오는 과정에서 렌더링이 이상하게 되는것이다.
![](https://velog.velcdn.com/images/seung365/post/983a8d5f-c7c3-4acc-aa06-e38d14c63553/image.gif)


**이때 처음에는 DB의 문제인줄 알았다.**
react query를 사용하여 API를 통해 DB의 내용을 가져오는 과정에서는 문제가 없다고 판단하였다. 그래서 먼저 백엔드 측에 DB를 초기화 시켜달라고 하였다. 이전에 메일 저장 버튼을 여러번 누를 수 있게 해놓아서 똑같은 메일들이 담겨있어 다음과 같은 문제가 생겼다고 판단했기 때문이다.
하지만 DB를 초기화 시켜도 다음과 같은 문제가 발생하였다.

그래서 개발자 모드를 들어가 렌더링이 어떻게 되는지 보았다.
**이때 렌더링 되는 부분이 중복되는 메일 내용이 아니라 일부만(검은 테두리) 렌더링이 되는것이였다.** 즉 API를 가져와 지는 부분은 문제가 없는데 다만 화면 내에 재 렌더링 이후에도 계속 존재한다는 것이였다. 그래서 리액트의 속성 중 바뀐 DOM의 내용만 변한다는게 생각이 났다. 그래서 내 마이페이지에서 메일 내용을 가져와 사용하는 코드를 다시 보았다.


![](https://velog.velcdn.com/images/seung365/post/d2b6f6c3-cf4b-4d8b-a30d-c21020e538bf/image.png) (위의 사진에서 직장인에서 같은 내용의 메일이 있는건 이때 DB에 두번 저장을 했었던때의 사진이여서 존재한것이다.)



```jsx
 mailData.content.map((email, index) => {
                  const mailId = `${email.createDate}-${index}`;
                  const isExpanded = expandedMails[mailId];
                  return (
                    <Box key={mailId} w="100%">
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="bold">{email.subject}</Text>
                        <HStack>
                          <Text fontSize="sm" color="gray.500">
                            {email.createDate}
                          </Text>
                          <IconButton
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            size="sm"
                            onClick={() => toggleMailContent(mailId)}
                          />
                        </HStack>
                      </HStack>
                      <Text noOfLines={isExpanded ? undefined : 2}>{email.body}</Text>
                      <Divider mt={2} />
                    </Box>
                  );
                })
```

다음과 같이 map을 사용하여 API response를 통해 받은 데이터를 뿌려주었다. 그리고 mailId를 만들어서 key를 부여해주었다. 
이때 API를 호출할 때 job에 따라 header의 내용이 달라진다. 그래서 하나의 API hook을 사용하여 두가지의 다른 내용을 받게 하였다. **그렇기에 map을 사용하는 경우 배열의 요소들에 key를 제대로 설정해주어야 했던 것이다.** 그래서 렌더링의 오류가 있었다고 판단하였다. 
```jsx
const createApiClient = (job: string) => {
  const token = sessionStorage.getItem('accessToken');
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      Job: job,
    },
  });
};
```
즉 배열의 내용은 달라지나 내가 key를 제대로 지정해주지 않아서 웹에서 재 렌더링을 할때 어떤 부분이 바뀐지 제대로 파악하지 못하였다고 생각이 들었다. 그래서 **아래와 같이 isJob이라는 요소를 추가해 key를 더 복잡하게 만들어 주었다.** 이렇게 해주니 정상적으로 재 렌더링이 됨을 알 수 있었다.

```jsx
const mailId = `${isJob}-${email.createDate}-${index}`;
```
